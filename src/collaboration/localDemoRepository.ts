import { demoListings } from "../data/demo-listings";
import { defaultCriteria } from "../lib/defaults";
import type { Criteria, DecisionKind } from "../types/models";
import type { CollaborationRepository, CreateGroupInput, HouseMatch, SearchGroup, SearchGroupDetail, SwipeResult, UserNotification, UserSwipe } from "./types";

const GROUP_ID = "demo";
const keys = { group: "nestmatch:v2:demo:group", swipes: "nestmatch:v2:demo:swipes", matches: "nestmatch:v2:demo:matches", notifications: "nestmatch:v2:demo:notifications" };
// This seed is deliberately module-private: consumers can learn only whether a mutual match was created.
const alexLoves = new Set(["demo-1", "demo-3", "demo-4", "demo-7", "demo-13", "demo-19"]);
const read = <T,>(key: string, fallback: T): T => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* demo remains usable without storage */ } };
const now = () => new Date().toISOString();

export class LocalDemoCollaborationRepository implements CollaborationRepository {
  private group(): SearchGroupDetail { return read(keys.group, { id: GROUP_ID, name: "Our Home Search", partnerName: "Alex", criteria: defaultCriteria }); }
  async listGroups(): Promise<SearchGroup[]> { const { id, name, partnerName } = this.group(); return [{ id, name, partnerName }]; }
  async createGroup(input: CreateGroupInput): Promise<SearchGroup> { const group = { id: GROUP_ID, name: input.name || "Our Home Search", partnerName: "Alex", criteria: input.criteria }; write(keys.group, group); return group; }
  async getGroup(groupId: string): Promise<SearchGroupDetail> { this.assertGroup(groupId); return this.group(); }
  async updateCriteria(groupId: string, criteria: Criteria) { this.assertGroup(groupId); write(keys.group, { ...this.group(), criteria }); }
  async getGroupListings(groupId: string) { this.assertGroup(groupId); return demoListings; }
  async saveSwipe(groupId: string, listingId: string, decision: DecisionKind): Promise<SwipeResult> {
    this.assertGroup(groupId); const swipes = read<UserSwipe[]>(keys.swipes, []); const existing = swipes.find(s => s.listingId === listingId);
    const swipe = existing?.decision === decision ? existing : { listingId, decision, savedAt: now() };
    write(keys.swipes, [...swipes.filter(s => s.listingId !== listingId), swipe]);
    if (decision !== "love" || !alexLoves.has(listingId)) return { swipe };
    const matches = read<HouseMatch[]>(keys.matches, []); const prior = matches.find(m => m.listingId === listingId);
    if (prior) return { swipe, match: prior };
    const match: HouseMatch = { id: `match-${listingId}`, groupId, listingId, createdAt: now(), archived: false };
    const notification: UserNotification = { id: `notification-${listingId}`, groupId, matchId: match.id, listingId, createdAt: match.createdAt };
    write(keys.matches, [...matches, match]); write(keys.notifications, [...read<UserNotification[]>(keys.notifications, []).filter(n => n.id !== notification.id), notification]);
    return { swipe, match, notification };
  }
  async removeSwipe(groupId: string, listingId: string) { this.assertGroup(groupId); if (read<HouseMatch[]>(keys.matches, []).some(m => m.listingId === listingId)) return false; const swipes = read<UserSwipe[]>(keys.swipes, []); write(keys.swipes, swipes.filter(s => s.listingId !== listingId)); return true; }
  async getMySwipes(groupId: string) { this.assertGroup(groupId); return read<UserSwipe[]>(keys.swipes, []); }
  async getMatches(groupId: string) { this.assertGroup(groupId); return read<HouseMatch[]>(keys.matches, []).filter(m => !m.archived); }
  async getNotifications() { return read<UserNotification[]>(keys.notifications, []); }
  async markNotificationRead(id: string) { write(keys.notifications, read<UserNotification[]>(keys.notifications, []).map(n => n.id === id ? { ...n, readAt: n.readAt || now() } : n)); }
  async archiveMatch(id: string) { write(keys.matches, read<HouseMatch[]>(keys.matches, []).map(m => m.id === id ? { ...m, archived: true } : m)); }
  async reset() { Object.values(keys).forEach(key => { try { localStorage.removeItem(key); } catch { /* no-op */ } }); }
  private assertGroup(id: string) { if (id !== GROUP_ID) throw new Error("Demo search not found"); }
}

export const localDemoCollaborationRepository = new LocalDemoCollaborationRepository();
