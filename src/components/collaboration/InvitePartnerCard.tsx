import { useState } from "react";
import { buildInvitationUrl } from "../../lib/invitations";

export const INVITE_SHARE_TITLE = "Join me on NestMatch";
export const INVITE_SHARE_MESSAGE = "I started a home search for us on NestMatch. Join me so we can privately choose homes and see which ones we both love.";
export const isShareCancellation = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

export function InvitePartnerCard({ token, onRevoke, onReplace }: { token: string; onRevoke: () => Promise<void>; onReplace: () => Promise<void> }) {
  const [feedback, setFeedback] = useState(""), [error, setError] = useState(""), url = buildInvitationUrl(token);
  const copy = async (content: string, success: string) => { setError(""); try { if (!navigator.clipboard?.writeText) throw new Error(); await navigator.clipboard.writeText(content); setFeedback(success); } catch { setFeedback(""); setError("Copying is unavailable. Select and copy the invitation link below."); } };
  const share = async () => { setError(""); setFeedback(""); if (!navigator.share) { await copy(url, "Invitation link copied."); return; } try { await navigator.share({ title: INVITE_SHARE_TITLE, text: INVITE_SHARE_MESSAGE, url }); setFeedback("Invitation shared."); } catch (reason) { if (!isShareCancellation(reason)) setError("Sharing did not open. You can copy the invitation instead."); } };
  return <section className="panel invite-card"><h2>Invite your person</h2><p>Your choices stay private unless you both Love the same home.</p><button className="button primary full-width" onClick={() => void share()}>Invite your person</button><div className="invite-fallbacks"><button className="button secondary" onClick={() => void copy(url, "Invitation link copied.")}>Copy invitation link</button><button className="button secondary" onClick={() => void copy(`${INVITE_SHARE_MESSAGE}\n\n${url}`, "Share message and link copied.")}>Copy message and link</button></div><output className="invite-url" aria-label="Invitation link">{url}</output>{feedback && <p className="success" role="status">{feedback}</p>}{error && <p className="error" role="alert">{error}</p>}<details className="invite-management"><summary>Manage invitation</summary><div className="button-row"><button className="button secondary compact" onClick={() => void onRevoke()}>Revoke link</button><button className="button secondary compact" onClick={() => void onReplace()}>Create replacement link</button></div></details></section>;
}
