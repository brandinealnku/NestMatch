import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { clearPendingInvite, savePendingInvite } from "../auth/pendingInvite";
import { AuthChoices } from "../components/auth/AuthChoices";
import { supabase } from "../lib/supabase";
import { SupabaseCollaborationRepository } from "../collaboration/SupabaseCollaborationRepository";

export function InvitePage() {
  const { token = "" } = useParams(), auth = useAuth(), navigate = useNavigate();
  const [state, setState] = useState<"ready" | "busy" | "error">("ready"), [message, setMessage] = useState("");
  useEffect(() => { if (token) savePendingInvite(token); }, [token]);
  const accept = async () => { if (!auth.user || !supabase) return; setState("busy"); setMessage(""); try { const result = await new SupabaseCollaborationRepository(supabase, auth.user.id).acceptInvitation(token); clearPendingInvite(); navigate(`/group/${result.groupId}`, { replace: true }); } catch { setState("error"); setMessage("This invitation is invalid, expired, already used, or no longer available."); clearPendingInvite(); } };
  return <section className="panel narrow auth-panel invitation-landing"><div className="invite-mark" aria-hidden="true">⌂</div><p className="eyebrow">A private NestMatch invitation</p><h1>You’ve been invited to find a home together.</h1><p className="lede small">Your choices stay private unless you both Love the same home.</p>
    {!auth.isConfigured ? <><p className="notice">Connected invitations are unavailable in Demo Mode.</p><Link className="button primary" to="/group/demo">Try the Collaborative Demo</Link></> : auth.isLoading ? <p role="status">Restoring your account and invitation…</p> : !auth.user ? <><p>Sign in to continue. You will return here automatically—no code or password required.</p><AuthChoices pendingInvite={token} /></> : !auth.profile?.displayName.trim() ? <><p>First, tell us what your search partner should call you. Your invitation will stay ready.</p><Link className="button primary" to="/profile">Complete profile</Link></> : <><button className="button primary full-width" onClick={() => void accept()} disabled={state === "busy"}>{state === "busy" ? "Accepting securely…" : "Accept invitation"}</button>{message && <p className="error" role="alert">{message}</p>}</>}
  </section>;
}
