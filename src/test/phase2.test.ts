import { afterEach, describe, expect, it } from "vitest";
import { getAuthProviderConfiguration, getSupabaseConfiguration } from "../lib/supabase";
import { buildInvitationUrl, sanitizeInvitationError } from "../lib/invitations";
import { clearPendingInvite, getPendingInvite, savePendingInvite, takePendingInvite } from "../auth/pendingInvite";
import { initials } from "../pages/ProfilePage";
import { oauthRedirectUrl, startOAuth } from "../auth/socialAuth";
import { vi } from "vitest";

afterEach(clearPendingInvite);
describe("Supabase configuration",()=>{
  it("falls back without both public values",()=>expect(getSupabaseConfiguration({VITE_SUPABASE_URL:"",VITE_SUPABASE_PUBLISHABLE_KEY:""})).toEqual({isConfigured:false}));
  it("rejects an invalid URL",()=>expect(getSupabaseConfiguration({VITE_SUPABASE_URL:"nope",VITE_SUPABASE_PUBLISHABLE_KEY:"public"}).isConfigured).toBe(false));
  it("accepts complete public configuration",()=>expect(getSupabaseConfiguration({VITE_SUPABASE_URL:"https://example.supabase.co",VITE_SUPABASE_PUBLISHABLE_KEY:"public"}).isConfigured).toBe(true));
});
it("enables social providers independently",()=>expect(getAuthProviderConfiguration({VITE_ENABLE_GOOGLE_AUTH:"true",VITE_ENABLE_APPLE_AUTH:"false"})).toEqual({google:true,apple:false}));
it("builds a non-hash Pages OAuth redirect",()=>expect(oauthRedirectUrl({origin:"https://brandinealnku.github.io"},"/NestMatch/")).toBe("https://brandinealnku.github.io/NestMatch/"));
it("starts Google and Apple OAuth with the supplied callback",async()=>{const signInWithOAuth=vi.fn().mockResolvedValue({error:null});await startOAuth({signInWithOAuth},"google","https://example.test/NestMatch/");await startOAuth({signInWithOAuth},"apple","https://example.test/NestMatch/");expect(signInWithOAuth).toHaveBeenNthCalledWith(1,{provider:"google",options:{redirectTo:"https://example.test/NestMatch/"}});expect(signInWithOAuth).toHaveBeenNthCalledWith(2,{provider:"apple",options:{redirectTo:"https://example.test/NestMatch/"}});});
it("constructs a HashRouter invitation URL beneath Pages",()=>expect(buildInvitationUrl("safe token","https://example.test/NestMatch/")).toBe("https://example.test/NestMatch/#/invite/safe%20token"));
it("keeps pending invitation in session storage and removes it on restoration",()=>{savePendingInvite("safe_token");expect(localStorage.length).toBe(0);expect(getPendingInvite()).toBe("safe_token");expect(getPendingInvite()).toBe("safe_token");expect(takePendingInvite()).toBe("safe_token");expect(takePendingInvite()).toBeNull();});
it("generates accessible profile initials",()=>expect(initials("  Ada Lovelace ")).toBe("AL"));
it("sanitizes invitation failures",()=>expect(sanitizeInvitationError(500)).not.toContain("token"));
