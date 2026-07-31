import { describe, expect, it, vi } from "vitest";
import { saveUserProfile } from "../auth/profileSave";
import type { NestMatchSupabaseClient } from "../lib/supabase";
import supabaseBrowserSource from "../lib/supabase.ts?raw";
import migration from "../../supabase/migrations/20260731120000_repair_profile_creation.sql?raw";
import foundationMigration from "../../supabase/migrations/20260730170000_phase2_collaboration.sql?raw";

function withoutSqlComments(sql: string): string {
  return sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function clientFor(updateResult: object, insertResult = { error: null }) {
  const maybeSingle = vi.fn().mockResolvedValue(updateResult);
  const select = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  const insert = vi.fn().mockResolvedValue(insertResult);
  const from = vi.fn(() => ({ update, insert }));
  return { client: { from } as unknown as NestMatchSupabaseClient, from, update, insert };
}

describe("profile creation repair migration", () => {
  it("uses one provider-independent auth.users trigger for every signup method", () => {
    const executableSql = withoutSqlComments(migration);

    expect(executableSql).toMatch(/after insert on auth\.users/i);
    expect(executableSql).toMatch(
      /for each row\s+execute function private\.new_profile\(\)/i,
    );

    expect(executableSql).not.toMatch(
      /raw_app_meta_data|raw_user_meta_data|app_metadata|provider\s*=|email\s*=|new\.email/i,
    );

    expect(executableSql).toMatch(
      /security definer[\s\S]*set search_path\s*=\s*''/i,
    );

    expect(executableSql).toMatch(/on conflict \(id\) do nothing/i);
  });

  it("backfills only missing rows and preserves completed display names", () => {
    expect(migration).toMatch(/left join public\.profiles[\s\S]*where p\.id is null/i);
    expect(migration).not.toMatch(/update public\.profiles/i);
  });

  it("keeps own-row RLS and prevents inserting another user's id", () => {
    expect(migration).toMatch(/enable row level security/i);
    expect(migration).toMatch(/with check \(auth\.uid\(\) = id\)/i);
    expect(foundationMigration).toMatch(
      /profile_update[\s\S]*using\(id=auth\.uid\(\)\) with check\(id=auth\.uid\(\)\)/i,
    );
    expect(foundationMigration).toMatch(/profile_read[\s\S]*using\(id=auth\.uid\(\)/i);
  });
});

describe("profile setup save", () => {
  const input = { displayName: " Ada ", avatarColor: "#315c53", browserNotificationsEnabled: false };

  it("advances through a direct own-profile update without inserting", async () => {
    const mock = clientFor({ data: { id: "user-1" }, error: null });
    await expect(saveUserProfile(mock.client, "user-1", input)).resolves.toBeUndefined();
    expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({ display_name: "Ada" }));
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("recovers a missing trigger row with an own-user insert", async () => {
    const mock = clientFor({ data: null, error: null });
    await expect(saveUserProfile(mock.client, "user-1", input)).resolves.toBeUndefined();
    expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({ id: "user-1", display_name: "Ada" }));
  });

  it("keeps database errors sanitized", async () => {
    const mock = clientFor({ data: null, error: { code: "42501", message: "secret database policy detail" } });
    await expect(saveUserProfile(mock.client, "user-1", input)).rejects.toThrow("We could not save your profile.");
  });

  it("requires a valid session before any database operation", async () => {
    const mock = clientFor({ data: null, error: null });
    await expect(saveUserProfile(mock.client, undefined, input)).rejects.toThrow("Sign in again");
    expect(mock.from).not.toHaveBeenCalled();
  });
});

it("does not put a service-role credential in browser source", () => {
  expect(supabaseBrowserSource).not.toMatch(/service.role/i);
});
