import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase env vars ma buuxsanayn. Ku dar VITE_SUPABASE_URL iyo " +
      "VITE_SUPABASE_ANON_KEY faylka .env (eeg .env.example)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);