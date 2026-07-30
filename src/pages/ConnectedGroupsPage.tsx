import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useConnectedRepository } from "../listings/useConnectedRepository";
import type { SearchGroup } from "../collaboration/types";

export function ConnectedGroupsPage() {
  const repository = useConnectedRepository(), [groups, setGroups] = useState<SearchGroup[]>([]), [error, setError] = useState("");
  useEffect(() => { if (!repository) return; let active = true; void repository.listGroups().then(value => active && setGroups(value)).catch(() => active && setError("We could not load your searches.")); return () => { active = false; }; }, [repository]);
  return <section className="panel"><h1>My Searches</h1>{error && <p role="alert">{error}</p>}{groups.map(group => <article className="privacy-card" key={group.id}><div><h2>{group.name}</h2><p>Shared listing inventory and private choices</p><div className="group-actions"><Link className="button primary" to={`/groups/${group.id}/discover`}>Swipe homes</Link><Link className="button secondary" to={`/groups/${group.id}/search`}>Find homes</Link></div></div></article>)}{!groups.length && !error && <p>No shared searches yet.</p>}<Link className="button" to="/groups/new">Create a search</Link></section>;
}
