import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { localDemoCollaborationRepository as repository } from "./localDemoRepository";
import type { DecisionKind } from "../types/models";
import type { HouseMatch, UserNotification, UserSwipe } from "./types";

type CollaborationContextValue = { swipes: UserSwipe[]; matches: HouseMatch[]; notifications: UserNotification[]; celebration: HouseMatch | null; decide: (listingId: string, decision: DecisionKind) => Promise<void>; undo: (listingId: string) => Promise<boolean>; dismissCelebration: () => void; markRead: (id: string) => Promise<void>; archive: (id: string) => Promise<void>; resetDemo: () => Promise<void> };
const Context = createContext<CollaborationContextValue | null>(null);
export function CollaborationProvider({ children }: { children: ReactNode }) {
  const [swipes, setSwipes] = useState<UserSwipe[]>([]), [matches, setMatches] = useState<HouseMatch[]>([]), [notifications, setNotifications] = useState<UserNotification[]>([]), [celebration, setCelebration] = useState<HouseMatch | null>(null);
  const refresh = useCallback(async () => { setSwipes(await repository.getMySwipes("demo")); setMatches(await repository.getMatches("demo")); setNotifications(await repository.getNotifications()); }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const value = useMemo<CollaborationContextValue>(() => ({ swipes, matches, notifications, celebration,
    decide: async (listingId, decision) => { const result = await repository.saveSwipe("demo", listingId, decision); await refresh(); if (result.notification) setCelebration(result.match || null); },
    undo: async listingId => { const removed = await repository.removeSwipe("demo", listingId); await refresh(); return removed; }, dismissCelebration: () => setCelebration(null),
    markRead: async id => { await repository.markNotificationRead(id); await refresh(); }, archive: async id => { await repository.archiveMatch(id); await refresh(); },
    resetDemo: async () => { await repository.reset(); setCelebration(null); await refresh(); },
  }), [swipes, matches, notifications, celebration, refresh]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useCollaboration = () => { const value = useContext(Context); if (!value) throw new Error("Collaboration context missing"); return value; };
