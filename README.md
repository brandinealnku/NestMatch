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

## Live-data architecture and RentCast setup

The browser calls only the deployed Supabase Edge Function URL in `VITE_LISTINGS_API_BASE_URL`. The function validates city/state or ZIP, radius (1–50), limit (1–100), and offset, then calls RentCast's sale-listings endpoint with `X-Api-Key`. It normalizes responses and sanitizes errors. Live availability depends on provider coverage and configuration.

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set RENTCAST_API_KEY=your_server_side_key
supabase secrets set ALLOWED_ORIGIN=https://your-github-pages-url
supabase functions deploy search-listings --no-verify-jwt
```

For local function work, use a gitignored Supabase environment file and `supabase functions serve search-listings --env-file supabase/.env.local --no-verify-jwt`. `RENTCAST_API_KEY` and `ALLOWED_ORIGIN` are server-side secrets; provider credentials must never be exposed in browser code, logs, a `VITE_` variable, or source control. Copy `.env.example` to `.env.local` and put only the public function URL there.

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
