
import React from 'react';

interface BudgetCircleProps {
  total: number;
  consumed: number;
  label: string;
}

const BudgetCircle: React.FC<BudgetCircleProps> = ({ total, consumed, label }) => {
  const percentage = Math.min((consumed / total) * 100, 100);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const remaining = total - consumed;
  const isOver = remaining < 0;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-40 h-40 transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="currentColor"
          strokeWidth="10"
          fill="transparent"
          className="text-slate-800"
        />
        {/* Progress Circle */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="currentColor"
          strokeWidth="10"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${isOver ? 'text-red-500' : 'text-emerald-500'} transition-all duration-500 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`text-2xl font-bold ${isOver ? 'text-red-400' : 'text-emerald-400'}`}>
          {Math.abs(remaining).toLocaleString()}
        </span>
        <span className="text-xs text-slate-400 uppercase tracking-wider">
          {isOver ? 'Over' : 'Under'}
        </span>
      </div>
    </div>
  );
};

export default BudgetCircle;
