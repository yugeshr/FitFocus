
import React from 'react';
import { Droplets, Plus } from 'lucide-react';

interface WaterTrackerProps {
  count: number;
  onAdd: (newCount: number) => void;
}

const WaterTracker: React.FC<WaterTrackerProps> = ({ count, onAdd }) => {
  const goal = 8;
  const percentage = Math.min((count / goal) * 100, 100);

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-[32px] p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-cyan-500/10 rounded-xl">
            <Droplets size={18} className="text-cyan-400" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-200">Hydration</h3>
        </div>
        <span className="text-xs font-bold text-cyan-400">{count} / {goal} cups</span>
      </div>

      <div className="relative h-3 bg-slate-900 rounded-full overflow-hidden">
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(34,211,238,0.4)]"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between gap-2">
        {[...Array(8)].map((_, i) => (
          <button
            key={i}
            onClick={() => onAdd(i + 1)}
            className={`flex-1 h-10 rounded-xl border transition-all duration-300 flex items-center justify-center ${
              i < count 
                ? 'bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-500/20' 
                : 'bg-slate-900/50 border-white/5 text-slate-600 hover:border-white/10'
            }`}
          >
            <Droplets size={14} fill={i < count ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default WaterTracker;
