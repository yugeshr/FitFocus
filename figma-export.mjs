#!/usr/bin/env node
/**
 * figma-export.mjs
 *
 * Starts the FitFocus dev server, captures screenshots at multiple viewports,
 * and exports them into a new Figma file via the Figma REST API.
 *
 * Usage:
 *   FIGMA_TOKEN=<your_personal_access_token> node figma-export.mjs
 *
 * Get a Figma personal access token at:
 *   https://www.figma.com/developers/api#access-tokens
 */

// playwright is a CommonJS module – import via default then destructure
import playwrightPkg from 'playwright';
const { chromium } = playwrightPkg;
import { spawn } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ───────────────────────────────────────────────────────────────────

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const SCREENSHOTS_DIR = join(__dirname, '.figma-screenshots');

const VIEWPORTS = [
  { name: 'Desktop', width: 1440, height: 900 },
  { name: 'Tablet',  width: 768,  height: 1024 },
  { name: 'Mobile',  width: 390,  height: 844 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) {
  process.stdout.write(`[figma-export] ${msg}\n`);
}

async function figmaRequest(method, path, body) {
  if (!FIGMA_TOKEN) {
    throw new Error(
      'FIGMA_TOKEN is not set.\n' +
      'Generate one at https://www.figma.com/developers/api#access-tokens\n' +
      'and re-run:\n  FIGMA_TOKEN=<token> node figma-export.mjs'
    );
  }

  const res = await fetch(`https://api.figma.com${path}`, {
    method,
    headers: {
      'X-Figma-Token': FIGMA_TOKEN,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Figma API ${method} ${path} → ${res.status}\n${text}`);
  }
  return JSON.parse(text);
}

// ── Server ────────────────────────────────────────────────────────────────────

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (res.ok || res.status < 500) return; // server is up
    } catch { /* not ready yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function startDevServer() {
  log('Starting Vite dev server…');
  const server = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  server.on('error', (err) => { throw err; });

  // Poll until the server is accepting HTTP connections
  await waitForServer(BASE_URL);
  log('Dev server ready.');
  return server;
}

// ── Screenshots ───────────────────────────────────────────────────────────────

async function captureScreenshots() {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  log('Launching Chromium…');
  // Use the pre-installed Chromium if the default path isn't available
  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const screenshots = [];

  for (const vp of VIEWPORTS) {
    log(`  Capturing ${vp.name} (${vp.width}×${vp.height})…`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });

    // Block external font/tracking requests that stall screenshots
    await page.route('**', (route) => {
      const url = route.request().url();
      const isLocal = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
      if (isLocal) return route.continue();
      // Abort external requests (fonts, analytics, CDNs) to prevent hangs
      return route.abort();
    });

    // 'commit' fires as soon as navigation begins (HTTP response received),
    // making it reliable even for apps with long-running network requests.
    await page.goto(BASE_URL, { waitUntil: 'commit', timeout: 30_000 });
    // Allow React to hydrate and render initial UI
    await page.waitForTimeout(3_000);

    const path = join(SCREENSHOTS_DIR, `${vp.name.toLowerCase()}.png`);
    await page.screenshot({ path, fullPage: false });
    await page.close();
    screenshots.push({ ...vp, path });
    log(`  ✓ Saved ${path}`);
  }

  await browser.close();
  return screenshots;
}

// ── Figma ─────────────────────────────────────────────────────────────────────

async function getFigmaUser() {
  log('Authenticating with Figma…');
  const data = await figmaRequest('GET', '/v1/me');
  log(`  ✓ Logged in as ${data.email}`);
  return data;
}

async function createFigmaFile(name) {
  log(`Creating Figma file "${name}"…`);
  // Creates a new draft file in the authenticated user's drafts
  const data = await figmaRequest('POST', '/v1/files', { name });
  const fileKey = data.key ?? data.file_key;
  log(`  ✓ File key: ${fileKey}`);
  log(`  ✓ https://www.figma.com/file/${fileKey}`);
  return fileKey;
}

async function uploadImageToFigma(fileKey, screenshotPath, nodeId) {
  const imageData = readFileSync(screenshotPath).toString('base64');
  const data = await figmaRequest('POST', `/v1/files/${fileKey}/images`, {
    imageData,
    imageType: 'PNG',
  });
  // Returns { images: { [nodeId]: imageRef } }
  return data.images?.[nodeId];
}

/**
 * Build a minimal Figma document with one CANVAS (page) containing one FRAME
 * per screenshot, each using a RECTANGLE with an IMAGE fill.
 *
 * Because the image refs aren't known until after the file is created and
 * images are uploaded, we first create the file with placeholder fills, upload
 * the images, then PATCH the nodes with the real refs.
 */
async function buildFigmaDocument(fileKey, screenshots) {
  log('Building Figma document…');

  const PADDING = 80;
  let xOffset = 0;

  // Step 1 – construct child frames (without image fills yet)
  const frames = screenshots.map((vp) => {
    const frame = {
      type: 'FRAME',
      name: vp.name,
      x: xOffset,
      y: 0,
      width: vp.width,
      height: vp.height,
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
      children: [],
    };
    xOffset += vp.width + PADDING;
    return frame;
  });

  const document = {
    name: 'FitFocus UI',
    document: {
      type: 'DOCUMENT',
      children: [
        {
          type: 'CANVAS',
          name: 'Captures',
          backgroundColor: { r: 0.94, g: 0.94, b: 0.94, a: 1 },
          children: frames,
        },
      ],
    },
  };

  await figmaRequest('PATCH', `/v1/files/${fileKey}`, document);
  log('  ✓ Document structure created');

  // Step 2 – get the node IDs that were just created
  const fileData = await figmaRequest('GET', `/v1/files/${fileKey}`);
  const canvas = fileData.document.children[0];
  const createdFrames = canvas.children;

  // Step 3 – upload images and update fills
  for (let i = 0; i < screenshots.length; i++) {
    const vp = screenshots[i];
    const frameNode = createdFrames[i];
    if (!frameNode) continue;

    log(`  Uploading image for ${vp.name}…`);
    const imageRef = await uploadImageToFigma(fileKey, vp.path, frameNode.id);

    if (imageRef) {
      // Patch the frame to use the real image fill
      await figmaRequest('PATCH', `/v1/files/${fileKey}`, {
        nodes: {
          [frameNode.id]: {
            fills: [
              {
                type: 'IMAGE',
                scaleMode: 'FILL',
                imageRef,
              },
            ],
          },
        },
      });
      log(`  ✓ Image fill applied to ${vp.name} frame`);
    } else {
      log(`  ⚠ Could not get image ref for ${vp.name}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  let server;

  try {
    // 1. Install deps if needed
    if (!process.env.SKIP_INSTALL) {
      log('Ensuring npm dependencies are installed…');
      const { execSync } = await import('child_process');
      execSync('npm install', { cwd: __dirname, stdio: 'inherit' });
    }

    // 2. Start dev server
    server = await startDevServer();

    // Brief pause for JS hydration
    await new Promise((r) => setTimeout(r, 2_000));

    // 3. Take screenshots
    const screenshots = await captureScreenshots();

    // 4. Figma export (only if token provided)
    if (!FIGMA_TOKEN) {
      log('');
      log('⚠  FIGMA_TOKEN not set – skipping Figma upload.');
      log('   Screenshots saved to: ' + SCREENSHOTS_DIR);
      log('   To export to Figma, set your token and re-run:');
      log('     FIGMA_TOKEN=<token> node figma-export.mjs');
      return;
    }

    await getFigmaUser();
    const fileKey = await createFigmaFile('FitFocus UI Captures');
    await buildFigmaDocument(fileKey, screenshots);

    log('');
    log('✓ Done!');
    log(`  Figma file: https://www.figma.com/file/${fileKey}`);
    log(`  Screenshots: ${SCREENSHOTS_DIR}`);

  } finally {
    if (server) {
      server.kill();
      log('Dev server stopped.');
    }
  }
}

main().catch((err) => {
  process.stderr.write(`\n[figma-export] ERROR: ${err.message}\n`);
  process.exit(1);
});
