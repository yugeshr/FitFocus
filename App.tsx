
import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, ClipboardList, Target, Compass, X, Keyboard, Camera, ChevronRight as ChevronRightIcon, User, Save, History, Trash2, Calendar as CalendarIcon, UtensilsCrossed, Plus, Zap, Flame, Scale } from 'lucide-react';
import { MealType, FoodItem, DailyLog, UserGoal, AIAnalysisResult, Gender, ActivityLevel } from './types';
import AddFoodModal from './components/AddFoodModal';
import EditFoodModal from './components/EditFoodModal';
import WaterTracker from './components/WaterTracker';

const getIstDateString = (date: Date): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

const createEmptyLog = (date: string): DailyLog => ({
  date,
  meals: {
    Breakfast: [],
    Lunch: [],
    Dinner: [],
    Snacks: []
  },
  waterIntake: 0
});

const INITIAL_GOAL: UserGoal = {
  dailyBudget: 2000,
  startingWeight: 80,
  currentWeight: 75.5,
  targetWeight: 70,
  height: 175,
  age: 28,
  gender: 'male',
  activityLevel: 'moderate',
  nutrientGoals: {
    protein: 150,
    carbs: 225,
    fat: 55
  }
};

const App: React.FC = () => {
  const todayStr = useMemo(() => getIstDateString(new Date()), []);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'log' | 'profile'>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [logs, setLogs] = useState<Record<string, DailyLog>>({ [todayStr]: createEmptyLog(todayStr) });
  const [goal, setGoal] = useState<UserGoal>(INITIAL_GOAL);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'text' | 'camera'>('text');
  const [selectedMealForAdd, setSelectedMealForAdd] = useState<MealType>('Breakfast');
  const [editingItem, setEditingItem] = useState<{ item: FoodItem, meal: MealType } | null>(null);
  const [tempGoal, setTempGoal] = useState<UserGoal>(INITIAL_GOAL);

  useEffect(() => {
    const saved = localStorage.getItem('fitfocus_v3_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.logs) setLogs(parsed.logs);
        if (parsed.goal) {
          setGoal(parsed.goal);
          setTempGoal(parsed.goal);
        }
      } catch (e) {
        console.error("Failed to load saved data");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('fitfocus_v3_data', JSON.stringify({ logs, goal }));
  }, [logs, goal]);

  const currentLog = useMemo(() => logs[selectedDate] || createEmptyLog(selectedDate), [logs, selectedDate]);

  const streakCount = useMemo(() => {
    let streak = 0;
    const sortedDates = Object.keys(logs).sort().reverse();
    const today = getIstDateString(new Date());
    
    // Check if today or yesterday has logs
    let checkDate = new Date();
    while (true) {
      const dateStr = getIstDateString(checkDate);
      const log = logs[dateStr];
      // Added type casting to FoodItem[][] to fix "Property 'length' does not exist on type 'unknown'"
      const hasEntries = log && (Object.values(log.meals) as FoodItem[][]).some(m => m.length > 0);
      
      if (hasEntries) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If it's not today and we broke the streak, stop
        if (dateStr !== today) break;
        // If today is empty, check yesterday to see if streak is still alive
        checkDate.setDate(checkDate.getDate() - 1);
        const yesterdayStr = getIstDateString(checkDate);
        const yesterdayLog = logs[yesterdayStr];
        // Added type casting to FoodItem[][] to fix "Property 'length' does not exist on type 'unknown'"
        if (!yesterdayLog || !(Object.values(yesterdayLog.meals) as FoodItem[][]).some(m => m.length > 0)) break;
      }
    }
    return streak;
  }, [logs]);

  const updateDailyWater = (count: number) => {
    setLogs(prev => ({
      ...prev,
      [selectedDate]: { ...currentLog, waterIntake: count }
    }));
  };

  const updateDailyWeight = (weight: number) => {
    setLogs(prev => ({
      ...prev,
      [selectedDate]: { ...currentLog, weight }
    }));
    // Sync to profile if it's the latest weight
    if (selectedDate === todayStr) {
      setGoal(prev => ({ ...prev, currentWeight: weight }));
      setTempGoal(prev => ({ ...prev, currentWeight: weight }));
    }
  };

  const calculateSmartGoals = () => {
    const { currentWeight, height, age, gender, activityLevel, targetWeight } = tempGoal;
    let bmr = (10 * currentWeight) + (6.25 * height) - (5 * age);
    bmr = gender === 'male' ? bmr + 5 : bmr - 161;
    const activityMultipliers: Record<ActivityLevel, number> = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, extra: 1.9
    };
    const tdee = bmr * activityMultipliers[activityLevel];
    let budget = currentWeight > targetWeight ? tdee - 500 : tdee + 300;
    budget = Math.max(1200, Math.round(budget));
    const protein = Math.round((budget * 0.30) / 4);
    const carbs = Math.round((budget * 0.45) / 4);
    const fat = Math.round((budget * 0.25) / 9);
    setTempGoal({ ...tempGoal, dailyBudget: budget, nutrientGoals: { protein, carbs, fat } });
  };

  const totals = useMemo(() => {
    let consumed = 0, protein = 0, carbs = 0, fat = 0;
    (Object.values(currentLog.meals) as FoodItem[][]).forEach(mealItems => {
      mealItems.forEach(item => {
        consumed += item.calories || 0;
        protein += item.protein || 0;
        carbs += item.carbs || 0;
        fat += item.fat || 0;
      });
    });
    return { consumed, protein, carbs, fat };
  }, [currentLog]);

  const handleAddItems = (aiResults: AIAnalysisResult[]) => {
    const newItems: FoodItem[] = aiResults.map(res => ({
      id: Math.random().toString(36).substr(2, 9),
      name: res.foodName,
      calories: res.estimatedCalories,
      protein: res.protein,
      carbs: res.carbs,
      fat: res.fat,
      servingSize: res.servingDescription,
      timestamp: Date.now()
    }));
    setLogs(prev => ({
      ...prev,
      [selectedDate]: {
        ...currentLog,
        meals: {
          ...currentLog.meals,
          [selectedMealForAdd]: [...currentLog.meals[selectedMealForAdd], ...newItems]
        }
      }
    }));
  };

  const handleUpdateItem = (meal: MealType, updatedItem: FoodItem) => {
    setLogs(prev => ({
      ...prev,
      [selectedDate]: {
        ...currentLog,
        meals: {
          ...currentLog.meals,
          [meal]: currentLog.meals[meal].map(item => item.id === updatedItem.id ? updatedItem : item)
        }
      }
    }));
  };

  const removeItem = (meal: MealType, id: string) => {
    setLogs(prev => ({
      ...prev,
      [selectedDate]: {
        ...currentLog,
        meals: { ...currentLog.meals, [meal]: currentLog.meals[meal].filter(item => item.id !== id) }
      }
    }));
  };

  // Added missing handleOpenModal function
  const handleOpenModal = (mode: 'text' | 'camera') => {
    setModalMode(mode);
    setIsAddModalOpen(true);
  };

  // Added missing saveProfile function
  const saveProfile = () => {
    setGoal(tempGoal);
  };

  const renderDashboard = () => {
    const remainingCals = goal.dailyBudget - totals.consumed;
    const isOver = remainingCals < 0;
    const allItems = (Object.entries(currentLog.meals) as [MealType, FoodItem[]][])
      .flatMap(([meal, items]) => items.map(item => ({ item, meal })));

    // Weight progress calculation
    const totalDist = Math.abs(goal.startingWeight - goal.targetWeight);
    const currentDist = Math.abs(goal.currentWeight - goal.targetWeight);
    const weightProgress = Math.min(Math.max(100 - (currentDist / totalDist) * 100, 0), 100);

    return (
      <div className="space-y-8 pb-40 pt-4 animate-in fade-in duration-500">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <p className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
              {selectedDate === todayStr ? 'Today' : selectedDate}
            </p>
            {streakCount > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                <Flame size={12} className="text-orange-500 animate-pulse" fill="currentColor" />
                <span className="text-[10px] font-black text-orange-500 uppercase">{streakCount} Day Streak</span>
              </div>
            )}
          </div>
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
            I ate
          </h1>
        </div>

        {/* Macros Grid */}
        <div className="grid grid-cols-2 gap-y-10 gap-x-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calories</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-black">{Math.round(totals.consumed)}</p>
              <p className={`text-[10px] font-bold ${isOver ? 'text-red-500' : 'text-slate-600'}`}>
                {isOver ? `+${Math.abs(remainingCals)}` : `${remainingCals} left`}
              </p>
            </div>
            <div className="w-full h-1 bg-slate-900 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-700 ${isOver ? 'bg-red-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min((totals.consumed / goal.dailyBudget) * 100, 100)}%` }}
              />
            </div>
          </div>
          {/* Proteins */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protein</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-black">{Math.round(totals.protein)}<span className="text-lg">g</span></p>
              <p className="text-[10px] font-bold text-slate-600">/ {goal.nutrientGoals.protein}g</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carbs</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-black">{Math.round(totals.carbs)}<span className="text-lg">g</span></p>
              <p className="text-[10px] font-bold text-slate-600">/ {goal.nutrientGoals.carbs}g</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fat</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-black">{Math.round(totals.fat)}<span className="text-lg">g</span></p>
              <p className="text-[10px] font-bold text-slate-600">/ {goal.nutrientGoals.fat}g</p>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-slate-900/40 border border-white/5 rounded-[32px] p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <Scale size={18} className="text-amber-400" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-200">Weight Tracker</h3>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                step="0.1"
                placeholder="0.0"
                className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                value={currentLog.weight || ''}
                onChange={(e) => updateDailyWeight(parseFloat(e.target.value) || 0)}
              />
              <span className="text-[10px] font-bold text-slate-500 uppercase">kg</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-slate-500">
              <span>Start: {goal.startingWeight}kg</span>
              <span className="text-amber-400">{Math.round(weightProgress)}% to Goal</span>
              <span>Target: {goal.targetWeight}kg</span>
            </div>
            <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000"
                style={{ width: `${weightProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Water Tracker Component */}
        <WaterTracker count={currentLog.waterIntake} onAdd={updateDailyWater} />

        {/* Meal History List */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-200">Recent Meals</h2>
            <button onClick={() => setActiveTab('log')} className="text-amber-500 text-xs font-bold flex items-center gap-1">
              Full Diary <ChevronRightIcon size={12} />
            </button>
          </div>
          <div className="space-y-6">
            {allItems.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-800 rounded-[32px] bg-slate-900/10">
                <p className="text-slate-600 text-sm font-medium">No meals logged for this day</p>
                <button onClick={() => handleOpenModal('text')} className="mt-4 text-amber-500 text-xs font-black uppercase tracking-widest">Add First Meal</button>
              </div>
            ) : (
              allItems.slice().reverse().map(({ item, meal }) => (
                <button 
                  key={item.id} 
                  onClick={() => setEditingItem({ item, meal })}
                  className="w-full flex items-start gap-4 group text-left hover:bg-white/5 p-2 -m-2 rounded-2xl transition-all"
                >
                  <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center flex-shrink-0 text-slate-400 group-hover:text-amber-500">
                    <History size={18} />
                  </div>
                  <div className="flex-1 min-w-0 border-b border-slate-900 pb-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-200 text-sm truncate">{item.name}</h4>
                      <span className="text-sm font-black text-slate-300">{item.calories}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 uppercase tracking-tighter">
                      {Math.round(item.protein)}g P • {Math.round(item.carbs)}g C • {Math.round(item.fat)}g F
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderLog = () => (
    <div className="space-y-8 pb-40 pt-4 animate-in slide-in-from-right duration-300">
      {/* Existing Diary Logic... */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black">Diary</h1>
        <div className="relative">
          <input type="date" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setSelectedDate(e.target.value)}/>
          <div className="bg-slate-900 p-2 rounded-xl text-amber-500 border border-slate-800">
            <CalendarIcon size={18} />
          </div>
        </div>
      </div>
      
      {(Object.entries(currentLog.meals) as [MealType, FoodItem[]][]).map(([meal, items]) => {
        const mealTotal = items.reduce((sum, i) => sum + i.calories, 0);
        return (
          <div key={meal} className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-900 pb-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{meal}</h3>
              <span className="text-xs font-bold text-amber-500">{mealTotal} cal</span>
            </div>
            <div className="space-y-4">
              {items.map((item) => (
                <button key={item.id} onClick={() => setEditingItem({ item, meal: meal as MealType })} className="w-full flex justify-between items-center group text-left">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-100 truncate">{item.name}</h4>
                    <p className="text-[10px] text-slate-600 font-medium">{item.servingSize}</p>
                  </div>
                  <span className="text-sm font-black text-slate-400">{item.calories}</span>
                </button>
              ))}
              <button 
                onClick={() => { setSelectedMealForAdd(meal as MealType); handleOpenModal('text'); }}
                className="text-[10px] font-black uppercase text-slate-800 hover:text-amber-500/50 flex items-center gap-1"
              >
                <Plus size={12} /> Add {meal}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-8 pb-40 pt-4 animate-in slide-in-from-left duration-300">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black">Profile</h1>
        <button onClick={saveProfile} className="bg-amber-500 text-black px-6 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-amber-400 active:scale-95 shadow-lg shadow-amber-500/20">
          <Save size={14} /> Save
        </button>
      </div>

      {/* Existing Profile Sections... */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Personal Info</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Gender</label>
            <div className="flex bg-slate-900 border border-slate-800 rounded-2xl p-1">
              {(['male', 'female'] as const).map(g => (
                <button key={g} onClick={() => setTempGoal({...tempGoal, gender: g})} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${tempGoal.gender === g ? 'bg-amber-500 text-black' : 'text-slate-500'}`}>{g}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Age</label>
            <input type="number" className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-2 text-sm font-bold text-white" value={tempGoal.age} onChange={e => setTempGoal({...tempGoal, age: parseInt(e.target.value) || 0})}/>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Starting Weight</label>
            <input type="number" step="0.1" className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-2 text-sm font-bold text-white" value={tempGoal.startingWeight} onChange={e => setTempGoal({...tempGoal, startingWeight: parseFloat(e.target.value) || 0})}/>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Target Weight</label>
            <input type="number" step="0.1" className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-2 text-sm font-bold text-white" value={tempGoal.targetWeight} onChange={e => setTempGoal({...tempGoal, targetWeight: parseFloat(e.target.value) || 0})}/>
          </div>
        </div>
      </section>

      <section className="bg-slate-900/30 border border-white/5 rounded-[32px] p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Targets</h2>
          <button onClick={calculateSmartGoals} className="flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full"><Zap size={12} fill="currentColor" /> Recalc</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Daily Budget</label>
            <input type="number" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm font-bold text-white" value={tempGoal.dailyBudget} onChange={e => setTempGoal({...tempGoal, dailyBudget: parseInt(e.target.value) || 0})}/>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-blue-500 font-black uppercase ml-1">Protein (g)</label>
            <input type="number" className="w-full bg-blue-500/10 border border-blue-500/20 rounded-2xl px-5 py-3 text-sm font-bold text-white" value={tempGoal.nutrientGoals.protein} onChange={e => setTempGoal({...tempGoal, nutrientGoals: {...tempGoal.nutrientGoals, protein: parseInt(e.target.value) || 0}})}/>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      <header className="px-8 pt-12 pb-4 flex justify-between items-center sticky top-0 bg-black/80 backdrop-blur-md z-30 border-b border-white/5">
        <button onClick={() => { setSelectedDate(todayStr); setActiveTab('dashboard'); }} className="text-amber-500 font-black italic text-xl tracking-tighter">FITFOCUS</button>
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveTab('log')} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${activeTab === 'log' ? 'bg-amber-500 text-black' : 'bg-slate-900 text-slate-500'}`}><ClipboardList size={20} /></button>
          <button onClick={() => setActiveTab('profile')} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${activeTab === 'profile' ? 'bg-amber-500 text-black' : 'bg-slate-900 text-slate-500'}`}><User size={20} /></button>
        </div>
      </header>

      <main className="flex-1 px-8 overflow-y-auto no-scrollbar pb-10">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'log' && renderLog()}
        {activeTab === 'profile' && renderProfile()}
      </main>

      {/* Action Pillar */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-black/90 border border-white/10 h-16 w-44 rounded-full shadow-2xl flex items-center justify-evenly px-2 ring-1 ring-white/10 backdrop-blur-xl">
          <button onClick={() => handleOpenModal('text')} className="flex-1 h-full flex flex-col items-center justify-center active:scale-90 transition-all">
            <Keyboard size={24} className="text-slate-200" /><span className="text-[8px] font-black uppercase text-slate-500 mt-1">Write</span>
          </button>
          <div className="w-[1px] h-6 bg-white/10" />
          <button onClick={() => handleOpenModal('camera')} className="flex-1 h-full flex flex-col items-center justify-center active:scale-90 transition-all">
            <Camera size={24} className="text-slate-200" /><span className="text-[8px] font-black uppercase text-slate-500 mt-1">Photo</span>
          </button>
        </div>
      </div>

      <AddFoodModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={handleAddItems} selectedMeal={selectedMealForAdd} initialMode={modalMode} />
      <EditFoodModal isOpen={!!editingItem} onClose={() => setEditingItem(null)} item={editingItem?.item || null} meal={editingItem?.meal || null} onUpdate={handleUpdateItem} onDelete={removeItem} />
    </div>
  );
};

export default App;
