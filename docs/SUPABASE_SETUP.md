# Supabase setup — Phase 2

Phase 2 supplies authentication, profiles, two-person groups, private swipe storage, database-created Love + Love matches, and secure invitations. Connected listing refresh/swiping, Realtime, and the connected Matches dashboard intentionally wait for Phase 3.

## Project and database

1. Create a Supabase project and install the [Supabase CLI](https://supabase.com/docs/guides/cli).
2. Run `supabase login`, then `supabase link --project-ref YOUR_PROJECT_REF`.
3. Apply the committed schema with `supabase db push` (or locally run `supabase start && supabase db reset`). Do not create tables manually.
4. In Database, confirm the eight public tables, `private` helper functions, four `updated_at` triggers, signup/profile trigger, owner-membership trigger, two-member trigger, and Love-match trigger.
5. Confirm RLS is enabled on every public table. `swipes` must have only own-user SELECT/write policies; `invitations` must have no browser policies.
6. With local Supabase running, install pgTAP if needed and run `supabase test db supabase/tests/phase2_rls.sql`. The committed suite checks policy shape, spoofing boundaries, unique match/notification guarantees, membership enforcement, and invitation primitives. Also perform the two-session scenario below.

The signup trigger creates `profiles.display_name` as an empty, non-null setup marker. The UI requires a trimmed name before protected navigation.

### Regenerating TypeScript database types

`src/types/supabase-database.types.ts` follows the Supabase CLI's generated schema shape and must stay in sync with the SQL migrations. With the local Supabase stack running, regenerate it with:

```bash
npm run types:supabase
```

For a linked remote project, use `supabase gen types typescript --linked > src/types/supabase-database.types.ts`; the linked project reference is intentionally not hardcoded. Review the generated diff against the committed migrations before committing it. The Supabase CLI is a contributor tool only and is not required by lint, tests, TypeScript, the Vite build, or Demo Mode.

## Authentication and Pages

Set Supabase Authentication URL Configuration exactly as follows:

```text
Site URL: https://brandinealnku.github.io/NestMatch/
Additional Redirect URLs:
https://brandinealnku.github.io/NestMatch/
http://localhost:5173/
```

Magic Links use PKCE. The redirect excludes the hash route. NestMatch exchanges the non-hash `?code=` once, removes it with `history.replaceState`, keeps the `/NestMatch/` path, and restores pending invitations from session storage.

## Edge Functions and secrets

Configure server-side secrets (never `VITE_` values):

```bash
supabase secrets set ALLOWED_ORIGIN=https://brandinealnku.github.io
supabase functions deploy create-invite
supabase functions deploy accept-invite
supabase functions deploy revoke-invite
```

Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into deployed functions. The service-role key remains server-only. The functions validate caller JWTs and origins; the production origin is configuration, not hardcoded server logic. For local development set `ALLOWED_ORIGIN=http://localhost:5173`; localhost origins are explicitly accepted.

## Browser and GitHub variables

Copy `.env.example` to gitignored `.env.local` and set only public values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_LISTINGS_API_BASE_URL=
VITE_APP_ENV=development
```

Add the same three `VITE_` values (except `VITE_APP_ENV`, which is optional) as GitHub **repository variables**, not secrets copied into source. Never put a service-role or provider credential in a browser variable.

## Verification

1. Request a Magic Link locally and in Pages; confirm callback query removal and profile setup.
2. In browser session A, create a group through the repository/owner UI foundation and create an invitation.
3. Open its hash URL in a private browser session B, sign in, return to the invite, and accept it.
4. Verify B cannot query A's swipes and a third session C cannot read group, listings, or matches.
5. Seed one group listing; Love it as both users. Confirm exactly one match and one notification per member after repeated upserts. Confirm normal clients cannot insert matches or other-user notifications.
6. Separately test expired, revoked, reused, self-accepted, nonowner-created, and full-group invitations.

## Troubleshooting

- **Demo Mode appears:** one or both public Supabase values are empty/invalid. This is a safe supported state.
- **Magic Link returns incorrectly:** check both trailing-slash redirect allow-list entries and ensure the email template uses the confirmation URL.
- **RLS denial:** verify the JWT user is an active `group_members` row and migrations are current; do not add broad policies.
- **Invitation unavailable:** it may be malformed, expired after seven days, revoked, used, self-accepted, or point to a full group. Errors are deliberately non-enumerating.
- **CORS failure:** set `ALLOWED_ORIGIN` to the request origin (`https://brandinealnku.github.io`, without a path).
- **SQL tests cannot connect:** run `supabase start`; Docker must be available. Do not treat a skipped suite as passing.
