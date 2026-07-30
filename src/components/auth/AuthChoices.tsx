import { useState, type FormEvent } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { savePendingInvite } from "../../auth/pendingInvite";

const AppleIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M17.1 12.5c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9-.8 0-1.9-.9-3.1-.9-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.5 1.2 9.9.8 1.2 1.8 2.5 3.1 2.4 1.2-.1 1.7-.8 3.2-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.9-1.1-2.9-3.9ZM14.7 5.3c.7-.9 1.2-2.1 1.1-3.3-1.1 0-2.4.8-3.2 1.7-.7.8-1.3 2-1.1 3.2 1.2.1 2.4-.6 3.2-1.6Z"/></svg>;
const GoogleIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.9V7.4H3.1A10 10 0 0 0 3.1 16.6L6.5 14Z"/><path fill="#EA4335" d="M12 6a5.4 5.4 0 0 1 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.1 7.4l3.4 2.7A5.9 5.9 0 0 1 12 6Z"/></svg>;

const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function AuthChoices({ pendingInvite }: { pendingInvite?: string }) {
  const auth = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false), [magicLink, setMagicLink] = useState(false);
  const [sent, setSent] = useState(false), [confirmationRequired, setConfirmationRequired] = useState(false), [error, setError] = useState(""), [submitting, setSubmitting] = useState(false);
  const busy = submitting || auth.activeAction !== null;
  const preserveInvite = () => { if (pendingInvite) savePendingInvite(pendingInvite); };
  const startSocial = async (provider: "apple" | "google") => { preserveInvite(); setError(""); try { await (provider === "apple" ? auth.signInWithApple() : auth.signInWithGoogle()); } catch (reason) { setError(reason instanceof Error ? reason.message : "We could not start sign-in."); } };
  const validate = () => {
    const normalized = email.trim().toLowerCase();
    if (!validEmail(normalized)) return "Enter a valid email address.";
    if (!magicLink && password.length < 8) return "Password must be at least 8 characters.";
    if (mode === "sign-up" && password !== confirmation) return "Passwords must match.";
    return "";
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return; setError("");
    const validationError = validate(); if (validationError) { setError(validationError); return; }
    preserveInvite(); setSubmitting(true);
    try {
      if (magicLink) { await auth.signInWithMagicLink(email); setSent(true); return; }
      if (mode === "sign-in") await auth.signInWithPassword(email, password);
      else { const result = await auth.signUpWithPassword(email, password); setConfirmationRequired(result.requiresEmailConfirmation); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We could not complete authentication."); }
    finally { setSubmitting(false); }
  };
  if (sent) return <div className="auth-status"><p role="status">Check your inbox for your private sign-in link.</p><p className="muted">Keep this browser tab available so NestMatch can restore your invitation.</p><button type="button" className="button secondary" onClick={() => setSent(false)}>Use another email</button></div>;
  if (confirmationRequired) return <div className="auth-status"><p role="status"><strong>Check your email to confirm your NestMatch account.</strong><br />After confirming, return here and sign in with your password.</p><p className="muted">Confirmation email delivery is subject to your project’s email limits.</p><button type="button" className="button secondary" onClick={() => { setConfirmationRequired(false); setMode("sign-in"); }}>Return to sign in</button></div>;
  return <div className="auth-choices">
    {(auth.enabledProviders.apple || auth.enabledProviders.google) && <>
      {auth.enabledProviders.apple && <button type="button" className="provider-button apple" disabled={busy} onClick={() => void startSocial("apple")}><AppleIcon />Continue with Apple</button>}
      {auth.enabledProviders.google && <button type="button" className="provider-button google" disabled={busy} onClick={() => void startSocial("google")}><GoogleIcon />Continue with Google</button>}
      <div className="auth-divider"><span>or use email</span></div>
    </>}
    {!magicLink && <div className="auth-tabs" role="tablist" aria-label="Email authentication">
      <button type="button" role="tab" aria-selected={mode === "sign-in"} onClick={() => { setMode("sign-in"); setError(""); }}>Sign in</button>
      <button type="button" role="tab" aria-selected={mode === "sign-up"} onClick={() => { setMode("sign-up"); setError(""); }}>Create account</button>
    </div>}
    <form onSubmit={submit} noValidate>
      <label htmlFor={pendingInvite ? "invite-email" : "email"}>Email</label>
      <input id={pendingInvite ? "invite-email" : "email"} type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
      {!magicLink && <>
        <label htmlFor="auth-password">Password</label>
        <input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={event => setPassword(event.target.value)} />
        {mode === "sign-up" && <><label htmlFor="auth-password-confirmation">Confirm password</label><input id="auth-password-confirmation" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required value={confirmation} onChange={event => setConfirmation(event.target.value)} /></>}
        <label className="password-visibility"><input type="checkbox" checked={showPassword} onChange={event => setShowPassword(event.target.checked)} /> Show password</label>
      </>}
      <button className="button primary" disabled={busy}>{busy ? "Please wait…" : magicLink ? "Email me a Magic Link" : mode === "sign-in" ? "Sign in" : "Create account"}</button>
    </form>
    <button type="button" className="auth-alternative" onClick={() => { setMagicLink(!magicLink); setError(""); }}>{magicLink ? "Use email and password instead" : "Email me a Magic Link instead"}</button>
    {(error || auth.authError) && <p className="error" role="alert" aria-live="assertive">{error || auth.authError}</p>}
  </div>;
}
