import { beforeEach, describe, expect, it } from "vitest";
import { LocalDemoCollaborationRepository } from "../collaboration/localDemoRepository";

describe("local collaborative demo", () => {
  beforeEach(() => localStorage.clear());
  it("creates a House Match only for Love + Alex's hidden Love", async () => { const repo = new LocalDemoCollaborationRepository(); expect((await repo.saveSwipe("demo", "demo-1", "maybe")).match).toBeUndefined(); expect((await repo.saveSwipe("demo", "demo-2", "love")).match).toBeUndefined(); expect((await repo.saveSwipe("demo", "demo-1", "love")).match?.listingId).toBe("demo-1"); });
  it.each(["pass", "maybe"] as const)("does not match a %s decision", async decision => { const repo = new LocalDemoCollaborationRepository(); expect((await repo.saveSwipe("demo", "demo-1", decision)).match).toBeUndefined(); expect(await repo.getMatches("demo")).toHaveLength(0); });
  it("is idempotent and deduplicates notifications", async () => { const repo = new LocalDemoCollaborationRepository(); await repo.saveSwipe("demo", "demo-1", "love"); await repo.saveSwipe("demo", "demo-1", "love"); expect(await repo.getMatches("demo")).toHaveLength(1); expect(await repo.getNotifications()).toHaveLength(1); });
  it("never exposes Alex's decisions", async () => { const repo = new LocalDemoCollaborationRepository(); expect(await repo.getMySwipes("demo")).toEqual([]); expect(Object.keys(repo)).not.toContain("alexLoves"); });
  it("allows undo before a match but locks matched homes", async () => { const repo = new LocalDemoCollaborationRepository(); await repo.saveSwipe("demo", "demo-2", "maybe"); expect(await repo.removeSwipe("demo", "demo-2")).toBe(true); await repo.saveSwipe("demo", "demo-1", "love"); expect(await repo.removeSwipe("demo", "demo-1")).toBe(false); });
  it("persists read state and resets only version 2 demo data", async () => { const repo = new LocalDemoCollaborationRepository(); localStorage.setItem("nestmatch:v1:decisions", "keep"); await repo.saveSwipe("demo", "demo-1", "love"); await repo.markNotificationRead("notification-demo-1"); expect((await repo.getNotifications())[0].readAt).toBeTruthy(); await repo.reset(); expect(await repo.getNotifications()).toEqual([]); expect(localStorage.getItem("nestmatch:v1:decisions")).toBe("keep"); });
});
