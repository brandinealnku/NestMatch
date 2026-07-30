import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { appBaseUrl, supabase, supabaseConfiguration } from "../lib/supabase";
import type { AuthUser, Profile, ProfileInput } from "./authTypes";

interface AuthContextValue { isConfigured: boolean; isLoading: boolean; user: AuthUser | null; profile: Profile | null; signInWithMagicLink(email: string): Promise<void>; signOut(): Promise<void>; refreshProfile(): Promise<void>; saveProfile(input: ProfileInput): Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null);
const toProfile = (row: Record<string, unknown>): Profile => ({ id: String(row.id), displayName: String(row.display_name ?? ""), avatarColor: typeof row.avatar_color === "string" ? row.avatar_color : undefined, browserNotificationsEnabled: row.browser_notifications_enabled === true, createdAt: String(row.created_at), updatedAt: String(row.updated_at) });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setLoading] = useState(supabaseConfiguration.isConfigured), [user, setUser] = useState<AuthUser | null>(null), [profile, setProfile] = useState<Profile | null>(null);
  const refreshProfile = useCallback(async () => { if (!supabase || !user) { setProfile(null); return; } const { data } = await supabase.from("profiles").select("id,display_name,avatar_color,browser_notifications_enabled,created_at,updated_at").eq("id", user.id).maybeSingle(); setProfile(data ? toProfile(data) : null); }, [user]);
  useEffect(() => { if (!supabase) { setLoading(false); return; } let alive = true; void supabase.auth.getSession().then(({ data }: { data: { session: { user: { id: string; email?: string } } | null } }) => { if (!alive) return; setUser(data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null); setLoading(false); }); const { data: listener } = supabase.auth.onAuthStateChange((_event: string, session: { user: { id: string; email?: string } } | null) => { if (!alive) return; setUser(session?.user ? { id: session.user.id, email: session.user.email } : null); if (!session) setProfile(null); }); return () => { alive = false; listener.subscription.unsubscribe(); }; }, []);
  useEffect(() => { void refreshProfile(); }, [refreshProfile]);
  const value = useMemo<AuthContextValue>(() => ({ isConfigured: supabaseConfiguration.isConfigured, isLoading, user, profile, refreshProfile,
    signInWithMagicLink: async email => { if (!supabase) throw new Error("Account sign-in is not configured."); const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: appBaseUrl() } }); if (error) throw new Error("We could not send a sign-in link. Please try again."); },
    signOut: async () => { setUser(null); setProfile(null); if (supabase) await supabase.auth.signOut(); window.dispatchEvent(new Event("nestmatch:auth-cleared")); },
    saveProfile: async input => { if (!supabase || !user) throw new Error("Sign in to save a profile."); const displayName = input.displayName.trim(); if (!displayName) throw new Error("Display name is required."); const { error } = await supabase.from("profiles").update({ display_name: displayName, avatar_color: input.avatarColor || null, browser_notifications_enabled: input.browserNotificationsEnabled }).eq("id", user.id); if (error) throw new Error("We could not save your profile."); await refreshProfile(); },
  }), [isLoading, user, profile, refreshProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => { const value = useContext(AuthContext); if (!value) throw new Error("Auth provider missing"); return value; };
