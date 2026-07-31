import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CollaborationError } from "../collaboration/SupabaseCollaborationRepository";
import { useConnectedRepository } from "../listings/useConnectedRepository";
import { dateTime } from "../lib/format";
import type { CachedListingInventory } from "../listings/listingTypes";
import type { SearchGroupDetail } from "../collaboration/types";
import { SharedSearchCreationForm } from "./NewGroupPage";

type GroupCard = { detail: SearchGroupDetail; inventory: CachedListingInventory };
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export function ConnectedGroupsPage() {
  const repository = useConnectedRepository(), [groups, setGroups] = useState<GroupCard[]>([]), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  useEffect(() => { if (!repository) return; let active = true;
    void repository.listGroups().then(items => Promise.all(items.map(async group => ({ detail: await repository.getGroup(group.id), inventory: await repository.getCachedInventory!(group.id) })))).then(value => { if (active) setGroups(value); }).catch(reason => { if (active) setError(reason instanceof CollaborationError && reason.code === "database_setup" ? "NestMatch’s shared-search database setup is incomplete." : "We could not load your searches."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [repository]);
  return <section className="panel groups-page"><div className="title-row"><div><p className="eyebrow">Connected</p><h1>My Searches</h1></div>{groups.length > 0 && <Link className="button primary" to="/groups/new">Create a search</Link>}</div>
    {error && <p role="alert">{error}</p>}
    {loading && <p role="status">Loading your shared searches…</p>}
    {!loading && !groups.length && !error && <SharedSearchCreationForm />}
    {groups.map(({ detail, inventory }) => { const criteria = detail.criteria; return <article className="privacy-card search-card" key={detail.id}><div><div className="title-row"><h2>{detail.name}</h2><span className="status-pill">{detail.currentUserRole === "owner" ? "Owner" : "Member"}</span></div>{detail.description && <p>{detail.description}</p>}<p><strong>{detail.memberCount ?? 0} of 2 members</strong> · {inventory.listings.length} saved {inventory.listings.length === 1 ? "home" : "homes"}</p><p>{criteria.mode === "zip" ? criteria.zipCode : `${criteria.city}, ${criteria.state}`} · {money(criteria.minPrice ?? 0)}–{money(criteria.maxPrice)} · {criteria.minBedrooms}+ beds · {criteria.minBathrooms}+ baths</p><p className="muted">{inventory.fetchedAt ? `Last refreshed ${dateTime(inventory.fetchedAt)}` : "Listings have not been fetched yet."}</p><div className="group-actions"><Link className="button primary" to={`/groups/${detail.id}`}>Open search</Link>{detail.currentUserRole === "owner" && <><Link className="button secondary" to={`/groups/${detail.id}/search`}>{inventory.listings.length ? "Edit criteria or refresh" : "Enter criteria"}</Link><Link className="button secondary" to={`/groups/${detail.id}`}>Invite your person</Link></>}</div></div></article>; })}
  </section>;
}
