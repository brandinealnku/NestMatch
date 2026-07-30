import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { appBaseUrl, requestMagicLink, requestPasswordSignIn, requestPasswordSignUp, supabase, supabaseConfiguration } from "../lib/supabase";
import type { AuthUser, Profile, ProfileInput } from "./authTypes";
import type { Tables } from "../types/supabase-database.types";
import { authProviderConfiguration } from "../lib/supabase";
import { safeProviderName, startOAuth, type SocialProvider } from "./socialAuth";

export type AuthAction = SocialProvider | "magic-link" | "password-sign-in" | "password-sign-up" | "password-update";
export interface AuthContextValue { isConfigured: boolean; enabledProviders: typeof authProviderConfiguration; isLoading: boolean; activeAction: AuthAction | null; authError: string; user: AuthUser | null; profile: Profile | null; signInWithGoogle(): Promise<void>; signInWithApple(): Promise<void>; signInWithMagicLink(email: string): Promise<void>; signInWithPassword(email: string, password: string): Promise<void>; signUpWithPassword(email: string, password: string): Promise<{ requiresEmailConfirmation: boolean }>; updatePassword(password: string): Promise<void>; clearAuthError(): void; signOut(): Promise<void>; refreshProfile(): Promise<void>; saveProfile(input: ProfileInput): Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null);
const toProfile = (row: Tables<"profiles">): Profile => ({ id: row.id, displayName: row.display_name, avatarColor: row.avatar_color ?? undefined, browserNotificationsEnabled: row.browser_notifications_enabled, createdAt: row.created_at, updatedAt: row.updated_at });
const mapUser = (source: { id: string; email?: string; user_metadata?: Record<string, unknown> }): AuthUser => { const candidate = source.user_metadata?.full_name ?? source.user_metadata?.name; const suggestedDisplayName = typeof candidate === "string" && candidate.trim() && !candidate.includes("@") ? candidate.trim() : undefined; return { id: source.id, email: source.email, suggestedDisplayName }; };
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setLoading] = useState(supabaseConfiguration.isConfigured), [activeAction, setActiveAction] = useState<AuthAction | null>(null), [authError, setAuthError] = useState(""), [user, setUser] = useState<AuthUser | null>(null), [profile, setProfile] = useState<Profile | null>(null);
  const redirectLocks = useRef(new Set<SocialProvider>());
  const refreshProfile = useCallback(async () => { if (!supabase || !user) { setProfile(null); return; } const { data } = await supabase.from("profiles").select("id,display_name,avatar_color,browser_notifications_enabled,created_at,updated_at").eq("id", user.id).maybeSingle(); setProfile(data ? toProfile(data) : null); }, [user]);
  useEffect(() => { if (!supabase) { setLoading(false); return; } let alive = true; void supabase.auth.getSession().then(({ data }) => { if (!alive) return; setUser(data.session?.user ? mapUser(data.session.user) : null); setLoading(false); }); const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { if (!alive) return; setUser(session?.user ? mapUser(session.user) : null); setActiveAction(null); if (!session) setProfile(null); }); return () => { alive = false; listener.subscription.unsubscribe(); }; }, []);
  useEffect(() => { void refreshProfile(); }, [refreshProfile]);
  const socialSignIn = useCallback(async (provider: SocialProvider) => { if (!supabase) throw new Error("Account sign-in is not configured."); if (!authProviderConfiguration[provider] || redirectLocks.current.has(provider)) return; redirectLocks.current.add(provider); setActiveAction(provider); setAuthError(""); try { await startOAuth(supabase.auth, provider, appBaseUrl()); } catch { redirectLocks.current.delete(provider); const message = `We could not start ${safeProviderName(provider)} sign-in. Please try another method.`; setAuthError(message); setActiveAction(null); throw new Error(message); } }, []);
  const value = useMemo<AuthContextValue>(() => ({ isConfigured: supabaseConfiguration.isConfigured, enabledProviders: authProviderConfiguration, isLoading, activeAction, authError, user, profile, refreshProfile,
    signInWithGoogle: () => socialSignIn("google"), signInWithApple: () => socialSignIn("apple"), clearAuthError: () => setAuthError(""),
    signInWithPassword: async (email, password) => {
      if (!supabase) {
        throw new Error("Account sign-in is not configured.");
      }

      const message =
        "We could not sign you in. Check your email and password. This account may require email confirmation before signing in.";

      setActiveAction("password-sign-in");
      setAuthError("");

      try {
        const { error } = await requestPasswordSignIn(
          supabase.auth,
          email,
          password,
        );

        if (error) {
          setAuthError(message);
          throw new Error(message);
        }
      } catch (error) {
        if (error instanceof Error && error.message === message) {
          throw error;
        }

        setAuthError(message);
        throw new Error(message);
      } finally {
        setActiveAction(null);
      }
    },
    signUpWithPassword: async (email, password) => {
      if (!supabase) {
        throw new Error("Account sign-in is not configured.");
      }

      const message =
        "We could not create your account. Please check your details and try again.";

      setActiveAction("password-sign-up");
      setAuthError("");

      try {
        const { data, error } = await requestPasswordSignUp(
          supabase.auth,
          email,
          password,
        );

        if (error) {
          setAuthError(message);
          throw new Error(message);
        }

        return {
          requiresEmailConfirmation: !data.session,
        };
      } catch (error) {
        if (error instanceof Error && error.message === message) {
          throw error;
        }

        setAuthError(message);
        throw new Error(message);
      } finally {
        setActiveAction(null);
      }
    },
    updatePassword: async password => {
      if (!supabase || !user) {
        throw new Error("Sign in to add or change a password.");
      }

      const message =
        "We could not update your password. Please try again.";

      setActiveAction("password-update");
      setAuthError("");

      try {
        const { error } = await supabase.auth.updateUser({
          password,
        });

        if (error) {
          setAuthError(message);
          throw new Error(message);
        }
      } catch (error) {
        if (error instanceof Error && error.message === message) {
          throw error;
        }

        setAuthError(message);
        throw new Error(message);
      } finally {
        setActiveAction(null);
      }
    },
    signInWithMagicLink: async email => { if (!supabase) throw new Error("Account sign-in is not configured."); if (activeAction === "magic-link") return; setActiveAction("magic-link"); setAuthError(""); const { error } = await requestMagicLink(supabase.auth, email.trim().toLowerCase()); setActiveAction(null); if (error) { const message="Email delivery is temporarily limited. You can still sign in with your password."; setAuthError(message); throw new Error(message); } },
    signOut: async () => { setUser(null); setProfile(null); if (supabase) await supabase.auth.signOut(); window.dispatchEvent(new Event("nestmatch:auth-cleared")); },
    saveProfile: async input => { if (!supabase || !user) throw new Error("Sign in to save a profile."); const displayName = input.displayName.trim(); if (!displayName) throw new Error("Display name is required."); const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: displayName, avatar_color: input.avatarColor || null, browser_notifications_enabled: input.browserNotificationsEnabled }); if (error) throw new Error("We could not save your profile."); await refreshProfile(); },
  }), [isLoading, activeAction, authError, user, profile, refreshProfile, socialSignIn]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => { const value = useContext(AuthContext); if (!value) throw new Error("Auth provider missing"); return value; };
