import { afterEach, describe, expect, it } from "vitest";
import { getSupabaseConfiguration } from "../lib/supabase";
import { buildInvitationUrl, sanitizeInvitationError } from "../lib/invitations";
import { clearPendingInvite, getPendingInvite, savePendingInvite, takePendingInvite } from "../auth/pendingInvite";
import { initials } from "../pages/ProfilePage";

afterEach(clearPendingInvite);
describe("Supabase configuration",()=>{
  it("falls back without both public values",()=>expect(getSupabaseConfiguration({VITE_SUPABASE_URL:"",VITE_SUPABASE_PUBLISHABLE_KEY:""})).toEqual({isConfigured:false}));
  it("rejects an invalid URL",()=>expect(getSupabaseConfiguration({VITE_SUPABASE_URL:"nope",VITE_SUPABASE_PUBLISHABLE_KEY:"public"}).isConfigured).toBe(false));
  it("accepts complete public configuration",()=>expect(getSupabaseConfiguration({VITE_SUPABASE_URL:"https://example.supabase.co",VITE_SUPABASE_PUBLISHABLE_KEY:"public"}).isConfigured).toBe(true));
});
it("constructs a HashRouter invitation URL beneath Pages",()=>expect(buildInvitationUrl("safe token","https://example.test/NestMatch/")).toBe("https://example.test/NestMatch/#/invite/safe%20token"));
it("keeps pending invitation in session storage and removes it on restoration",()=>{savePendingInvite("token");expect(localStorage.length).toBe(0);expect(getPendingInvite()).toBe("token");expect(getPendingInvite()).toBe("token");expect(takePendingInvite()).toBe("token");expect(takePendingInvite()).toBeNull();});
it("generates accessible profile initials",()=>expect(initials("  Ada Lovelace ")).toBe("AL"));
it("sanitizes invitation failures",()=>expect(sanitizeInvitationError(500)).not.toContain("token"));
