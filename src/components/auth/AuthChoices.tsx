import { useState, type FormEvent } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { savePendingInvite } from "../../auth/pendingInvite";

const AppleIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M17.1 12.5c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9-.8 0-1.9-.9-3.1-.9-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.5 1.2 9.9.8 1.2 1.8 2.5 3.1 2.4 1.2-.1 1.7-.8 3.2-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.9-1.1-2.9-3.9ZM14.7 5.3c.7-.9 1.2-2.1 1.1-3.3-1.1 0-2.4.8-3.2 1.7-.7.8-1.3 2-1.1 3.2 1.2.1 2.4-.6 3.2-1.6Z"/></svg>;
const GoogleIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.9V7.4H3.1A10 10 0 0 0 3.1 16.6L6.5 14Z"/><path fill="#EA4335" d="M12 6a5.4 5.4 0 0 1 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.1 7.4l3.4 2.7A5.9 5.9 0 0 1 12 6Z"/></svg>;

export function AuthChoices({ pendingInvite }: { pendingInvite?: string }) {
  const auth = useAuth();
  const [email, setEmail] = useState(""), [sent, setSent] = useState(false), [error, setError] = useState("");
  const preserveInvite = () => { if (pendingInvite) savePendingInvite(pendingInvite); };
  const startSocial = async (provider: "apple" | "google") => { preserveInvite(); setError(""); try { await (provider === "apple" ? auth.signInWithApple() : auth.signInWithGoogle()); } catch (reason) { setError(reason instanceof Error ? reason.message : "We could not start sign-in."); } };
  const submit = async (event: FormEvent) => { event.preventDefault(); preserveInvite(); setError(""); try { await auth.signInWithMagicLink(email); setSent(true); } catch (reason) { setError(reason instanceof Error ? reason.message : "We could not send a sign-in link."); } };
  if (sent) return <div className="auth-status"><p role="status">Check your inbox for your private sign-in link.</p><p className="muted">Keep this browser tab available so NestMatch can restore your invitation.</p><button className="button secondary" onClick={() => setSent(false)}>Use another email</button></div>;
  return <div className="auth-choices">
    {auth.enabledProviders.apple && <button type="button" className="provider-button apple" aria-label="Continue with Apple" disabled={auth.activeAction === "apple"} onClick={() => void startSocial("apple")}><AppleIcon />{auth.activeAction === "apple" ? "Redirecting to Apple…" : "Continue with Apple"}</button>}
    {auth.enabledProviders.google && <button type="button" className="provider-button google" aria-label="Continue with Google" disabled={auth.activeAction === "google"} onClick={() => void startSocial("google")}><GoogleIcon />{auth.activeAction === "google" ? "Redirecting to Google…" : "Continue with Google"}</button>}
    <div className="auth-divider"><span>or</span></div>
    <form onSubmit={submit}>
      <label htmlFor={pendingInvite ? "invite-email" : "email"}>Email address</label>
      <input id={pendingInvite ? "invite-email" : "email"} type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
      <button className="button secondary" disabled={auth.activeAction === "magic-link"}>{auth.activeAction === "magic-link" ? "Sending…" : "Email me a sign-in link"}</button>
    </form>
    {(error || auth.authError) && <p className="error" role="alert">{error || auth.authError}</p>}
  </div>;
}
