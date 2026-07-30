import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthProvider";

export function SettingsPage() {
  const auth = useAuth();
  const [password, setPassword] = useState(""), [confirmation, setConfirmation] = useState(""), [show, setShow] = useState(false);
  const [message, setMessage] = useState(""), [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setMessage("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmation) { setError("Passwords must match."); return; }
    try { await auth.updatePassword(password); setPassword(""); setConfirmation(""); setMessage("Your password has been updated. You can use it the next time you sign in."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "We could not update your password. Please try again."); }
  };
  return <section className="panel narrow settings-page"><h1>Settings</h1>
    <h2>Add or change password</h2><p className="muted">Create a password fallback without retrieving or displaying any existing password.</p>
    <form onSubmit={submit}>
      <label htmlFor="new-password">New password</label><input id="new-password" type={show ? "text" : "password"} autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} />
      <label htmlFor="confirm-new-password">Confirm new password</label><input id="confirm-new-password" type={show ? "text" : "password"} autoComplete="new-password" minLength={8} required value={confirmation} onChange={event => setConfirmation(event.target.value)} />
      <label className="password-visibility"><input type="checkbox" checked={show} onChange={event => setShow(event.target.checked)} /> Show password</label>
      {error && <p className="error" role="alert" aria-live="assertive">{error}</p>}{message && <p className="success" role="status">{message}</p>}
      <button className="button primary" disabled={auth.activeAction === "password-update"}>{auth.activeAction === "password-update" ? "Updating…" : "Update password"}</button>
    </form><hr /><button className="button secondary" onClick={() => void auth.signOut()}>Sign out</button>
  </section>;
}
