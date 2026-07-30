import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

export interface SupabaseConfiguration { isConfigured: boolean; url?: string; publishableKey?: string }
export function getSupabaseConfiguration(env: Pick<ImportMetaEnv, "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY"> = import.meta.env): SupabaseConfiguration {
  const url = env.VITE_SUPABASE_URL?.trim(), publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return { isConfigured: false };
  try { new URL(url); } catch { return { isConfigured: false }; }
  return { isConfigured: true, url, publishableKey };
}

export type NestMatchSupabaseClient = SupabaseClient<Database>;
export const supabaseConfiguration = getSupabaseConfiguration();
export const supabase: NestMatchSupabaseClient | null = supabaseConfiguration.isConfigured
  ? createClient<Database>(supabaseConfiguration.url!, supabaseConfiguration.publishableKey!, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;
export const appBaseUrl = () => window.location.origin + import.meta.env.BASE_URL;
