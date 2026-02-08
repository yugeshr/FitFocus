import { createClient } from "@supabase/supabase-js";
import { DailyLog, UserGoal } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const USER_ID = "default_user";

export const loadUserData = async (): Promise<{ logs?: Record<string, DailyLog>, goal?: UserGoal } | null> => {
    try {
        const { data, error } = await supabase
            .from("users")
            .select("logs, goal")
            .eq("id", USER_ID)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                // Row not found — return null so the app uses defaults
                return null;
            }
            throw error;
        }

        return data as { logs?: Record<string, DailyLog>, goal?: UserGoal };
    } catch (error) {
        console.error("Error loading data from Supabase:", error);
        return null;
    }
};

export const saveUserData = async (data: { logs: Record<string, DailyLog>, goal: UserGoal }) => {
    try {
        const { error } = await supabase
            .from("users")
            .upsert({
                id: USER_ID,
                logs: data.logs,
                goal: data.goal,
                updated_at: new Date().toISOString(),
            });

        if (error) throw error;
    } catch (error) {
        console.error("Error saving data to Supabase:", error);
    }
};
