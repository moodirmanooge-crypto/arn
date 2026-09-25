import { createClient } from "@supabase/supabase-js";

// Qiimayaasha default-ka ah — waa PUBLIC (publishable key waxaa loogu talagalay
// browser-ka; amniga xogta waxaa ilaaliya RLS). Waxay shaqeeyaan xitaa haddii
// .env la waayo marka server-ka (hosting) lagu build-gareeyo.
const DEFAULT_SUPABASE_URL = "https://xhlewescbvhfuiwhvtlt.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_oxYLVTEEjclQu7OXHRlxiQ_ME-Iltup";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.info("Supabase: .env lama helin — waxaa la isticmaalayaa qiimayaasha default-ka ah.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);