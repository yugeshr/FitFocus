
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

// Always use { apiKey: process.env.API_KEY } directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    foodName: { type: Type.STRING, description: "Name of the food" },
    estimatedCalories: { type: Type.NUMBER, description: "Estimated calorie count" },
    protein: { type: Type.NUMBER, description: "Grams of protein" },
    carbs: { type: Type.NUMBER, description: "Grams of carbohydrates" },
    fat: { type: Type.NUMBER, description: "Grams of fat" },
    servingDescription: { type: Type.STRING, description: "Typical serving size description" },
  },
  required: ["foodName", "estimatedCalories", "protein", "carbs", "fat", "servingDescription"],
  propertyOrdering: ["foodName", "estimatedCalories", "protein", "carbs", "fat", "servingDescription"],
};

export const analyzeFoodImage = async (base64Image: string): Promise<AIAnalysisResult | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
          { text: "Analyze this food image. Identify the food and estimate its total calories, protein, carbs, and fat in grams, along with a typical serving size." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA,
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as AIAnalysisResult;
  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    return null;
  }
};

export const parseNaturalLanguageFood = async (input: string): Promise<AIAnalysisResult[] | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Parse this food diary entry: "${input}". Extract a list of food items, their estimated calories, protein (g), carbs (g), fat (g), and serving sizes.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: ANALYSIS_SCHEMA
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as AIAnalysisResult[];
  } catch (error) {
    console.error("Gemini NLP Error:", error);
    return null;
  }
};
