# NestMatch

**Swipe less. Find the home that fits.**

NestMatch is a responsive, accessible home-discovery app. A buyer records practical criteria, reviews one transparently scored home at a time, and compares Loved homes. Phase 1 of Version 2 adds a local Couple Match Demo while preserving the complete solo experience.

## Screenshots

Run the app and open the landing, Discover, and Shortlist views; the repository does not commit binary screenshots to keep it lightweight.

## Features

- Five-step validated preference onboarding with explicit non-negotiables
- 27 fictional Cincinnati/Northern Kentucky demonstration homes and local original illustrations
- Provider-independent demo/live adapters, client-side hard filtering, and a deterministic 100-point match explanation
- Button, touch-swipe, and keyboard decisions (left Pass, down Maybe, right Love, Backspace Undo)
- Detail views, missing-data states, persistent decisions, shortlist sorting, and a responsive top-three comparison
- Safe recovery from corrupted/unavailable local storage; no account, cookies, analytics, or geolocation
- Hash routing and relative production assets for GitHub Pages
- A collaborative local demo with simulated partner Alex, private seeded decisions, Love + Love House Matches, an accessible celebration, a Matches dashboard, notifications, undo protection, versioned persistence, and Reset Demo

## Stack and structure

React, TypeScript, Vite, React Router, Vitest, Testing Library, ESLint, and plain CSS. `src/pages` contains views; `src/providers` isolates listing sources; `src/lib` contains pure filtering/formatting; `src/scoring` owns matching; `src/storage` owns versioned persistence; `supabase/functions/search-listings` is the server-side RentCast boundary.

## Local development and Demo Mode

```bash
npm install
npm run dev
```

Leave `VITE_LISTINGS_API_BASE_URL` empty to use Demo Mode. Demo listings are **fictional** and are not active offers for sale. No credential is needed. Choose **Try Couple Match Demo** to review the shared deck with simulated partner Alex; no real account, invitation, network collaboration, or Supabase connection is used in Phase 1.

## Phase 3A live shared listings and RentCast setup

Signed-in owners call the deployed `search-listings` Supabase Edge Function through the existing public Supabase client. The function authenticates the caller, verifies active group ownership, validates city/state or ZIP and criteria, and calls RentCast's active sale-listings endpoint once. Normalized snapshots are cached in `group_listings`, so both members load the same stable inventory without another provider request. Page loads, logins, callbacks, and route changes never trigger RentCast.

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set RENTCAST_API_KEY=YOUR_KEY
npx supabase secrets set ALLOWED_ORIGIN=https://brandinealnku.github.io
npx supabase functions deploy search-listings
```

For local function work, set `ALLOWED_ORIGIN=http://localhost:5173` and `RENTCAST_API_KEY=server-side-only` in a gitignored Supabase function environment. Both values are **Supabase Edge Function secrets**, never `VITE_` variables. The browser needs only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; `VITE_LISTINGS_API_BASE_URL` is retained only for the earlier solo provider adapter and is not used by connected searches.

RentCast's sale-listings response currently does not document a listing-photo collection. Phase 3A therefore does not scrape or invent photos: connected cards use the branded NestMatch placeholder unless a future explicitly permitted normalized image URL is supplied. Coverage and fields vary by market and provider plan.

### Brandi and Joe two-browser test

1. Brandi signs in and creates or opens a shared group.
2. She opens **Find homes**, enters a Cincinnati/Northern Kentucky city and state or local ZIP, chooses criteria, and taps **Find homes**.
3. Brandi shares the existing invitation; Joe signs in in a separate browser/incognito session and joins.
4. Confirm both see the same listing inventory. Brandi Loves a home; Joe must not see her decision.
5. Joe Loves that home. Confirm exactly one mutual match and the existing notification for each member.
6. Reload both browsers. Listings, private swipes, and matches persist, and reloading makes no RentCast request. Only an explicit owner **Refresh listings** action consumes another call.

## Security

Provider descriptions are rendered as plain React text. External listing links appear only for validated HTTP(S) provider URLs and use `noopener noreferrer`. The proxy never accepts a provider key from a caller and permits only the configured production origin (localhost is the development default). There is no `dangerouslySetInnerHTML`, tracking, or collection of unnecessary personal data.

## Tests and production build

```bash
npm run lint
npm run test
npm run build
```

## GitHub Pages

1. Push to the primary branch.
2. Open **Repository Settings → Pages → Source → GitHub Actions**.
3. The workflow installs dependencies, lints, tests, builds, uploads, and deploys `dist`.
4. To enable live search, also deploy the Edge Function and set `VITE_LISTINGS_API_BASE_URL` in the build environment; a static Pages deployment remains fully usable in Demo Mode.

Hash routing permits refreshes beneath a repository subpath. Vite emits relative asset paths without hardcoding an owner or repository.

## Troubleshooting and data limitations

- **Demo banner shown:** expected when the proxy URL is absent.
- **Configuration error:** deploy the function and set both server secrets.
- **401 / 429:** verify the RentCast key or provider plan/limits.
- **Old data:** use Refresh Listings; there is no polling.
- **No results:** edit requirements; NestMatch never relaxes them automatically.
- **Missing facts/photos:** unknown is displayed honestly and omitted from score normalization. Live photos appear only when the provider supplies an authorized URL.

Live listing availability depends on provider coverage and configuration. Listing data can be incomplete or outdated, and property details should be independently verified. NestMatch is not a brokerage, lender, appraisal service, or inspection service.

## Accessibility and fair housing

Semantic controls, visible focus, skip navigation, live announcements, touch-sized buttons, non-gesture alternatives, reduced-motion support, a captioned comparison table, and honest missing states are built in. Match inputs are explicit property/financial facts only. NestMatch never collects or scores protected-class information or neighborhood-demographic proxies.

## Current limitations

Collaborative Demo data is local to one browser and Alex is simulated. Phase 1 has no accounts, real invitations, synchronization, Supabase, or realtime collaboration. It also has no notes, full interactive maps, commute estimates, tours, financing, transactions, or market analytics. Live lookup returns the configured provider page only and does not scrape listing sites. See [ROADMAP.md](ROADMAP.md).

## Version 2 Phase 2: secure collaboration foundation

The Phase 1 Collaborative Demo (including simulated Alex) remains available without an account or Supabase configuration. Phase 2 adds optional Magic Link PKCE authentication, profile setup, secure two-person group storage, private swipe RLS, database-created Love + Love matches, and hashed single-use invitations. Connected shared swiping, live shared deck refresh, Realtime celebrations, and the full connected Matches dashboard are intentionally deferred to Phase 3.

Browser builds accept only `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and optional `VITE_LISTINGS_API_BASE_URL`; empty Supabase values safely retain Demo Mode. Apply migrations with `supabase db push`, deploy `create-invite`, `accept-invite`, and `revoke-invite`, and keep `SUPABASE_SERVICE_ROLE_KEY` plus `ALLOWED_ORIGIN` server-side. Raw invitation tokens are returned once, shared in the hash URL, held temporarily in `sessionStorage`, and stored in PostgreSQL only as SHA-256 hashes. RLS permits a user to select only their own swipes; mutual matches are created atomically by a fixed-search-path database trigger.

See [the complete Supabase setup guide](docs/SUPABASE_SETUP.md) for Auth redirect settings, GitHub variables, migrations, functions, local SQL tests, two-browser verification, and troubleshooting.

### Phase 2.5: mobile social auth and sharing

Optional Apple and Google OAuth now lead the mobile sign-in experience, with Magic Link retained as the passwordless fallback. Provider buttons are independently controlled by `VITE_ENABLE_APPLE_AUTH` and `VITE_ENABLE_GOOGLE_AUTH`; credentials remain in the provider consoles and Supabase. Invitations persist only their raw one-time token in `sessionStorage`, return through the existing PKCE callback/profile flow, and are validated by the secure acceptance function. Invitation owners can use the native Web Share sheet or accessible clipboard fallbacks. See [the setup and mobile test guide](docs/SUPABASE_SETUP.md#google-oauth).

## v0.4 Live Couple Match Beta

v0.4 is a private, testable two-person connected experience: an authenticated shared-search dashboard, private cached-listing review, a private Maybe list, database-backed mutual Matches, RLS-filtered Realtime updates, one-time notification-backed celebrations, shared match notes, two/three-home comparison, and an installable app shell. Demo Mode and Magic Link remain available; Google and Apple code/flags are preserved but provider configuration is deferred. This beta is not public-production readiness. Agent, tour, mortgage, subscription, additional-provider, and public-launch workflows remain out of scope.

Apply the additive notes/Realtime migration with `npx supabase db push`. Enable Realtime replication for `matches`, `notifications`, and `match_notes` (the migration adds these tables to `supabase_realtime`; confirm them in **Database → Replication**). Deploy the existing invitation and listing Edge Functions as documented below. Normal page loads use `group_listings`; only the owner’s explicit Find/Refresh action calls RentCast.

### Install on a phone

- **iPhone/iPad (Safari):** open the deployed NestMatch URL, tap **Share**, then **Add to Home Screen** and **Add**.
- **Android (Chrome):** open NestMatch, use **Install app** in the browser menu or install prompt, then confirm.

The service worker caches only the public app shell and icons. Navigations are network-first, Supabase/auth/invitation URLs are never handled by the cache, and authenticated API responses are not cached. An offline page explains how to reconnect; reopening online reloads persisted Supabase data.

### Brandi and Joe beta checklist

1. Brandi opens NestMatch on her phone.
2. Brandi signs in with Magic Link.
3. Brandi creates or opens the shared search.
4. Brandi loads real Cincinnati/Northern Kentucky listings if needed.
5. Brandi invites Joe.
6. Joe opens the invitation on his phone.
7. Joe signs in and joins.
8. Both add NestMatch to their home screens.
9. Brandi reviews at least five listings.
10. Joe must not see Brandi’s individual decisions.
11. Joe reviews the same inventory independently.
12. They Love at least one of the same homes.
13. Exactly one match is created.
14. Both see the match without manually reloading.
15. Both see the celebration once.
16. Both see their own notification.
17. Brandi adds a shared note.
18. Joe can read it and add his own.
19. Each user can edit only their own note.
20. They compare two matched homes.
21. They close and reopen the app.
22. Listings, swipes, matches, notifications, and notes persist.
23. No normal reload consumes a RentCast request.
24. A third account cannot access the group.

**Beta feedback:** record sign-in friction, invitation friction, search clarity, swipe speed, match excitement, note usefulness, comparison usefulness, bugs, missing information, and whether each person would use NestMatch again.

Known limitations: no browser push, background sync, native app, chat, Google/Apple provider configuration, tours, agents, financing, or public onboarding. Realtime falls back to a 30-second poll and manual refresh. Listing photos and fields depend on the cached provider snapshot. Match archiving remains owner-controlled by RLS.
