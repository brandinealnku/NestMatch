import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase-database.types";

export interface SupabaseConfiguration { isConfigured: boolean; url?: string; publishableKey?: string }
export interface AuthProviderConfiguration { google: boolean; apple: boolean }
const enabled = (value: string | undefined) => value?.trim().toLowerCase() === "true";
export function getAuthProviderConfiguration(env: Pick<ImportMetaEnv, "VITE_ENABLE_GOOGLE_AUTH" | "VITE_ENABLE_APPLE_AUTH"> = import.meta.env): AuthProviderConfiguration {
  return { google: enabled(env.VITE_ENABLE_GOOGLE_AUTH), apple: enabled(env.VITE_ENABLE_APPLE_AUTH) };
}
export function getSupabaseConfiguration(env: Pick<ImportMetaEnv, "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY"> = import.meta.env): SupabaseConfiguration {
  const url = env.VITE_SUPABASE_URL?.trim(), publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return { isConfigured: false };
  try { new URL(url); } catch { return { isConfigured: false }; }
  return { isConfigured: true, url, publishableKey };
}

export type NestMatchSupabaseClient = SupabaseClient<Database, "public">;
export const supabaseConfiguration = getSupabaseConfiguration();
export const authProviderConfiguration = getAuthProviderConfiguration();
export const supabase: NestMatchSupabaseClient | null = supabaseConfiguration.isConfigured
  ? createClient<Database, "public">(supabaseConfiguration.url!, supabaseConfiguration.publishableKey!, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;
export const appBaseUrl = () => new URL(import.meta.env.BASE_URL, `${window.location.origin}/`).toString();
