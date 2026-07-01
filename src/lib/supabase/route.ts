import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

export function createAnonRouteClient() {
  const { url, key } = getSupabaseEnv();
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
