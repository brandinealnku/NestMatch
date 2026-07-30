# Supabase setup — Phase 2 and Phase 2.5 social authentication

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

### Google OAuth

1. In Google Cloud, create an OAuth web client. Add `https://brandinealnku.github.io` and `http://localhost:5173` as authorized JavaScript origins.
2. Add `https://nasbzmojopixtyofebvv.supabase.co/auth/v1/callback` as the authorized redirect URI. Google returns to Supabase first; Supabase then returns to the allow-listed NestMatch URL.
3. In **Supabase Dashboard → Authentication → Sign In / Providers → Google**, enable Google and enter the Google client ID and client secret.
4. Keep the Google client secret in Supabase/Google only. It is never a GitHub variable or `VITE_` value.
5. Retain `https://brandinealnku.github.io/NestMatch/` in Supabase's redirect allow list for GitHub Pages and `http://localhost:5173/` for local use.

### Apple OAuth

Apple sign-in requires a paid Apple Developer account. Create an App ID with Sign in with Apple and a Services ID for the website. Associate the Services ID with the primary App ID, configure `brandinealnku.github.io` as the web domain, and configure `https://nasbzmojopixtyofebvv.supabase.co/auth/v1/callback` as the return URL. Complete Apple's website-domain association requirements before enabling production sign-in.

In **Supabase Dashboard → Authentication → Sign In / Providers → Apple**, enter the Apple Services ID, Team ID, Key ID, and the generated signing-key/client-secret material. The `.p8` signing key and generated Apple client secret belong in Apple/Supabase—not GitHub, Vite, or this repository. Apple's generated client secret expires and must be rotated before its configured expiration.

Apple may provide a name only on the first authorization and may supply a private relay address when Hide My Email is selected. NestMatch therefore always treats the Supabase user ID as the canonical identity, asks for an editable display name, never displays an email as the default name, and does not silently merge accounts. A relay identity may be distinct from an existing Google/email identity; account linking remains a user/Supabase administration concern.

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
VITE_ENABLE_GOOGLE_AUTH=true
VITE_ENABLE_APPLE_AUTH=true
VITE_LISTINGS_API_BASE_URL=
VITE_APP_ENV=development
```

Add the public Supabase values and the two independent provider flags as GitHub **repository variables**, not secrets copied into source. Set a flag to `true` only after that provider is enabled in Supabase; disabled buttons are not rendered. Never put a service-role, Google secret, Apple signing key, or provider client secret in a browser variable. Magic Link remains available whenever Supabase public configuration exists.

## Phase 2.5 mobile manual verification

**Google:** On a phone, open NestMatch, tap Continue with Google, authenticate, verify return to `/NestMatch/`, verify the `?code=` query disappears, complete the profile if prompted, then sign out and repeat.

**Apple:** In mobile Safari, tap Continue with Apple, test both shared email and Hide My Email when possible, verify the Pages return and callback cleanup, and complete the editable profile prompt. Repeat sign-in to confirm the chosen profile name is not overwritten.

**Invitation:** User A creates an invitation, taps Invite your person, and sends it from the native share sheet. User B opens it in another mobile browser, signs in with Apple, Google, or Magic Link, returns automatically, completes profile setup if needed, and accepts without copying a token. Confirm both users can access the group and a third user cannot. Also test share cancellation, clipboard denial, refresh before sign-in/during profile setup, expired/reused links, and widths 320, 375, 390, and 430px.

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
