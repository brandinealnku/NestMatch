import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CollaborationError } from "../collaboration/SupabaseCollaborationRepository";
import { defaultCriteria } from "../lib/defaults";
import { useConnectedRepository } from "../listings/useConnectedRepository";

export function SharedSearchCreationForm({ showBackLink = false }: { showBackLink?: boolean }) {
  const repository = useConnectedRepository();
  const navigate = useNavigate();
  const [name, setName] = useState("Our Home Search");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !repository) return;
    const trimmedName = name.trim();
    if (!trimmedName) { setError("Enter a name for your shared search."); return; }
    setBusy(true); setError("");
    try {
      const group = await repository.createGroup({ name: trimmedName, description: description.trim() || undefined, criteria: defaultCriteria });
      if (!group.id?.trim()) throw new Error("invalid group");
      navigate(`/groups/${group.id}/search`, { replace: true });
    } catch (reason) {
      setError(reason instanceof CollaborationError && reason.code === "database_setup"
        ? "NestMatch’s shared-search database setup is incomplete."
        : reason instanceof CollaborationError && reason.code === "invalid"
          ? "Check the search name and description, then try again."
          : "We could not create your shared search. Please try again.");
    } finally { setBusy(false); }
  };

  return <section className="page narrow search-setup">
    <p className="eyebrow">My Searches</p>
    <h1>Create your first shared search</h1>
    <p>Create one private, two-person search. You will choose real listing criteria next and can invite your person whenever you are ready.</p>
    <form onSubmit={(event) => void submit(event)} noValidate aria-busy={busy}>
      <label>Search name<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} autoFocus /></label>
      <label>Short description <span className="optional">(optional)</span><textarea maxLength={240} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What are you hoping to find?" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary" disabled={busy} type="submit">{busy ? "Creating shared search…" : "Create shared search"}</button>
    </form>
    {showBackLink && <Link className="button secondary" to="/groups">Back to My Searches</Link>}
  </section>;
}

export function NewGroupPage() { return <SharedSearchCreationForm showBackLink />; }
