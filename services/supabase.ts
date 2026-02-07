import { createClient } from "@supabase/supabase-js";
import { DailyLog, UserGoal } from "../types";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const USER_ID = "default_user";

export const loadUserData = async (): Promise<{
  logs?: Record<string, DailyLog>;
  goal?: UserGoal;
} | null> => {
  try {
    const { data, error } = await supabase
      .from("user_data")
      .select("logs, goal")
      .eq("user_id", USER_ID)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found — first-time user
        return null;
      }
      console.error("Error loading data from Supabase:", error.message);
      return null;
    }

    return data as { logs?: Record<string, DailyLog>; goal?: UserGoal };
  } catch (error) {
    console.error("Error loading data from Supabase:", error);
    return null;
  }
};

export const saveUserData = async (data: {
  logs: Record<string, DailyLog>;
  goal: UserGoal;
}) => {
  try {
    const { error } = await supabase.from("user_data").upsert(
      {
        user_id: USER_ID,
        logs: data.logs,
        goal: data.goal,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("Error saving data to Supabase:", error.message);
    }
  } catch (error) {
    console.error("Error saving data to Supabase:", error);
  }
};
