
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'extra';

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  timestamp: number;
}

export interface DailyLog {
  date: string;
  meals: Record<MealType, FoodItem[]>;
  weight?: number; // Weight logged on this specific day
  waterIntake: number; // Number of glasses/cups
}

export interface NutrientGoals {
  protein: number;
  carbs: number;
  fat: number;
}

export interface UserGoal {
  dailyBudget: number;
  startingWeight: number;
  currentWeight: number;
  targetWeight: number;
  height: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  nutrientGoals: NutrientGoals;
}

export interface AIAnalysisResult {
  foodName: string;
  estimatedCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingDescription: string;
}
