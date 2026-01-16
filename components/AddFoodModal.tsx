
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Mic, X, Loader2, Sparkles, Send } from 'lucide-react';
import { analyzeFoodImage, parseNaturalLanguageFood } from '../services/gemini';
import { AIAnalysisResult, MealType } from '../types';

interface AddFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (items: AIAnalysisResult[]) => void;
  selectedMeal: MealType;
  initialMode: 'text' | 'camera';
}

const AddFoodModal: React.FC<AddFoodModalProps> = ({ isOpen, onClose, onAdd, selectedMeal, initialMode }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'camera'>(initialMode);
  const [aiInput, setAiInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setActiveTab(initialMode);
    if (initialMode === 'camera' && isOpen) {
      setTimeout(() => fileInputRef.current?.click(), 100);
    }
    if (initialMode === 'text' && isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      if (initialMode === 'camera') onClose();
      return;
    }

    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const result = await analyzeFoodImage(base64);
      if (result) {
        onAdd([result]);
        onClose();
      }
      setIsAnalyzing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleNlpSubmit = async () => {
    if (!aiInput.trim()) return;
    setIsAnalyzing(true);
    const results = await parseNaturalLanguageFood(aiInput);
    if (results && results.length > 0) {
      onAdd(results);
      onClose();
      setAiInput('');
    }
    setIsAnalyzing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-[2px] transition-all">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative bg-slate-100 rounded-t-[32px] p-6 pb-12 w-full max-w-md mx-auto shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-start mb-4">
          <div className="bg-slate-200/50 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Logged to {selectedMeal}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative group">
            <textarea
              ref={inputRef}
              className="w-full bg-transparent border-none text-slate-800 text-lg font-medium p-0 focus:ring-0 placeholder:text-slate-400 resize-none min-h-[100px]"
              placeholder="What did you eat?"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              disabled={isAnalyzing}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleNlpSubmit();
                }
              }}
            />
            
            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-amber-500 transition-colors"
                >
                  <Camera size={22} />
                </button>
                <button className="p-2 text-slate-400 hover:text-amber-500 transition-colors">
                  <Mic size={22} />
                </button>
              </div>

              <button
                onClick={handleNlpSubmit}
                disabled={isAnalyzing || !aiInput.trim()}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  aiInput.trim() ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-200 text-slate-400'
                }`}
              >
                {isAnalyzing ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Send size={20} fill={aiInput.trim() ? "currentColor" : "none"} />
                )}
              </button>
            </div>
          </div>
        </div>

        {isAnalyzing && (
          <div className="mt-4 flex items-center gap-2 text-amber-600 font-bold text-xs animate-pulse">
            <Sparkles size={14} />
            AI is analyzing nutrients...
          </div>
        )}

        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
      </div>
    </div>
  );
};

export default AddFoodModal;
