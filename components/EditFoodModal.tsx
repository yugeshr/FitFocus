
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { FoodItem, MealType } from '../types';

interface EditFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FoodItem | null;
  meal: MealType | null;
  onUpdate: (meal: MealType, updatedItem: FoodItem) => void;
  onDelete: (meal: MealType, id: string) => void;
}

const EditFoodModal: React.FC<EditFoodModalProps> = ({ isOpen, onClose, item, meal, onUpdate, onDelete }) => {
  const [formData, setFormData] = useState<FoodItem | null>(null);

  useEffect(() => {
    if (item) {
      setFormData({ ...item });
    }
  }, [item]);

  if (!isOpen || !formData || !meal) return null;

  const handleSave = () => {
    onUpdate(meal, formData);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      onDelete(meal, formData.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm transition-all">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative bg-[#111] border-t border-white/10 rounded-t-[32px] p-8 pb-12 w-full max-w-md mx-auto shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-black text-white">Edit Entry</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Food Name</label>
            <input 
              type="text" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all text-white"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Calories</label>
              <input 
                type="number" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all text-white"
                value={formData.calories}
                onChange={(e) => setFormData({ ...formData, calories: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Serving Size</label>
              <input 
                type="text" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all text-white"
                value={formData.servingSize}
                onChange={(e) => setFormData({ ...formData, servingSize: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] text-blue-500 font-black uppercase text-center block">Protein</label>
              <input 
                type="number" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-center text-sm font-bold text-white"
                value={formData.protein}
                onChange={(e) => setFormData({ ...formData, protein: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-amber-500 font-black uppercase text-center block">Carbs</label>
              <input 
                type="number" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-center text-sm font-bold text-white"
                value={formData.carbs}
                onChange={(e) => setFormData({ ...formData, carbs: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-rose-500 font-black uppercase text-center block">Fat</label>
              <input 
                type="number" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-center text-sm font-bold text-white"
                value={formData.fat}
                onChange={(e) => setFormData({ ...formData, fat: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              onClick={handleDelete}
              className="flex-1 bg-red-500/10 text-red-500 h-14 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all"
            >
              <Trash2 size={16} />
              Delete
            </button>
            <button 
              onClick={handleSave}
              className="flex-[2] bg-amber-500 text-black h-14 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/20"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditFoodModal;
