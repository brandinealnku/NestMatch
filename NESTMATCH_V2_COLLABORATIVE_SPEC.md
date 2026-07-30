# NestMatch Version 2 — Collaborative House Matching

## Purpose

This is the source-of-truth specification for upgrading the existing `brandinealnku/NestMatch` repository. Do not rebuild the app from scratch. Inspect the current `main` branch and preserve the working React, TypeScript, Vite, HashRouter, scoring, filtering, demo listings, property details, accessibility, tests, and GitHub Pages deployment.

## Product vision

NestMatch helps two people independently review the same homes and discover the properties they both love.

**NestMatch**

**Swipe less. Find the home that fits.**

**Invite your person. Swipe privately. Match on the homes you both love.**

Do not copy Tinder branding, colors, flame imagery, layouts, animations, or wording.

## Core experience

1. User A signs in and creates a shared home search.
2. User A defines shared criteria and creates one listing deck.
3. User A shares a secure invitation link.
4. User B signs in and accepts.
5. Both users review the same homes independently.
6. Each selects Pass, Maybe, or Love.
7. Unmatched decisions remain private.
8. Only Love + Love creates a House Match.
9. Both users receive a persistent notification.
10. Connected users receive a realtime in-app alert.
11. Mutual matches appear in a shared Matches dashboard.

## Privacy rules

Before a mutual match, neither user may see the partner's:

- Pass, Maybe, or Love decisions
- Swipe counts or progress
- Unmatched decision timestamps
- API rows containing unmatched swipes

This must be enforced by Supabase Row Level Security, not only hidden in React.

| User A | User B | Result |
|---|---|---|
| Love | Love | House Match |
| Love | Maybe | No visible match |
| Maybe | Maybe | No visible match |
| Love | Pass | No visible match |
| Maybe | Pass | No visible match |
| Pass | Pass | No visible match |

Match creation must be database-driven, atomic, idempotent, and duplicate-safe.

## Required operating modes

### Connected mode

When Supabase public configuration is present:

- Magic Link authentication
- Profiles
- Two-person search groups
- Secure invitations
- Shared listing snapshots
- Private Supabase swipes
- Persistent matches and notifications
- Realtime match alerts

### Collaborative Demo Mode

When Supabase is absent:

- No account required
- No Supabase calls
- Simulated partner named Alex
- Alex's seeded decisions remain hidden
- A user Love matching Alex's hidden Love creates a local House Match
- Celebration, notifications, and Matches dashboard work locally
- Versioned local persistence
- Reset Demo control

Display:

> Collaborative Demo: Alex is a simulated partner. No real account or invitation is connected.

## Preserve Version 1

Retain:

- Existing visual identity
- Landing page direction
- Search preferences
- Demo dataset
- Listing-provider abstraction
- RentCast Edge Function boundary
- Hard filtering
- 100-point scoring and explanations
- Pass, Maybe, Love, Undo
- Keyboard and touch alternatives
- Property details
- Solo shortlist
- Missing-data handling
- Local-storage recovery
- Accessibility
- Tests and CI
- GitHub Pages

## Technology

Continue using React, TypeScript, Vite, React Router, HashRouter, Vitest, Testing Library, ESLint, Prettier, and the current CSS architecture.

Add `@supabase/supabase-js`.

Use typed repositories rather than direct Supabase calls scattered through components.

Suggested interface:

```ts
interface CollaborationRepository {
  listGroups(): Promise<SearchGroup[]>;
  createGroup(input: CreateGroupInput): Promise<SearchGroup>;
  getGroup(groupId: string): Promise<SearchGroupDetail>;
  updateCriteria(groupId: string, criteria: Criteria): Promise<void>;
  getGroupListings(groupId: string): Promise<Listing[]>;
  saveSwipe(
    groupId: string,
    listingId: string,
    decision: DecisionKind,
  ): Promise<SwipeResult>;
  getMySwipes(groupId: string): Promise<UserSwipe[]>;
  getMatches(groupId: string): Promise<HouseMatch[]>;
  getNotifications(): Promise<UserNotification[]>;
  markNotificationRead(notificationId: string): Promise<void>;
  archiveMatch(matchId: string): Promise<void>;
}
```

Implement local-demo and Supabase repositories.

## Environment

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_LISTINGS_API_BASE_URL=
VITE_APP_ENV=development
```

Never expose a service-role key in browser code. Missing values must activate Demo Mode instead of crashing. Type variables in `src/vite-env.d.ts`.

## Authentication

Use email Magic Links with PKCE.

Production base:

`https://brandinealnku.github.io/NestMatch/`

Callback requirements:

1. Build redirect from `window.location.origin + import.meta.env.BASE_URL`.
2. Do not put a HashRouter route in the Supabase redirect URL.
3. Detect the authorization `code` query parameter before protected routing.
4. Exchange it once.
5. Remove it with `history.replaceState`.
6. Restore a pending invitation from `sessionStorage`.
7. Navigate to the correct hash route.
8. Show safe loading and error states.

Document Supabase Auth settings:

```text
Site URL:
https://brandinealnku.github.io/NestMatch/

Additional redirect URLs:
https://brandinealnku.github.io/NestMatch/
http://localhost:5173/
```

Profiles require display name, optional avatar color, browser-notification preference, and timestamps.

## Search groups

Version 2 supports exactly two active members:

- Owner
- Member

Owner controls criteria, listing refresh, invitations, member removal, and archiving. Both can swipe and view mutual matches. Neither can read the other's unmatched swipes.

Default name: `Our Home Search`

Waiting copy:

> Your search is ready. Invite someone to start finding your mutual matches.

## Database migrations

Create timestamped migrations in `supabase/migrations/`.

Required tables:

### profiles

- `id` referencing `auth.users`
- `display_name`
- `avatar_color`
- `browser_notifications_enabled`
- timestamps
- secure new-user profile trigger

### search_groups

- ID
- owner
- name
- criteria JSON
- active/archived status
- max members fixed at 2
- timestamps

### group_members

- group and user composite key
- owner/member role
- active/left/removed status
- joined and left timestamps
- database enforcement of no more than two active members
- automatically add creator as owner/member

### group_listings

- group and listing composite key
- normalized listing snapshot JSON
- source
- fetched and update timestamps
- no provider credentials

### swipes

- group, listing, and user composite key
- decision constrained to pass/maybe/love
- timestamps
- idempotent upsert

### matches

- unique group/listing
- match type fixed to love_love
- active/archived status
- created timestamp

### notifications

- user
- group
- match
- type
- read timestamp
- created timestamp
- unique House Match notification per user/match

### invitations

- group
- creator
- SHA-256 token hash
- expiration
- accepted user/time
- revoked time
- raw token never stored
- default expiration seven days

Add appropriate indexes and reusable `updated_at` triggers.

## Match trigger

Create a secure PostgreSQL trigger after swipe insert/update.

When the new decision is Love:

1. Confirm active membership.
2. Find the other active member server-side.
3. Check the other member's Love on the same listing.
4. Insert one unique match with conflict-safe behavior.
5. Only when newly inserted, create one notification per active member.

Use `security definer`, fixed safe `search_path`, qualified references, and no browser-supplied partner ID.

If a Love changes after a match exists, retain the match. It can be archived from Matches.

## Row Level Security

Enable RLS on every exposed table.

Critical swipe rule:

- Users may select, insert, update, and delete only rows where `user_id = auth.uid()`.
- They must be active members of the group.
- Never allow group members to read all group swipes.

Other rules:

- Profiles: own profile plus limited active partner identity
- Groups: active members read; owner edits
- Membership: group members read; arbitrary browser insertion prohibited
- Group listings: active members read; owner/server writes
- Matches: members read; browser cannot insert
- Notifications: users read/update only their own
- Invitations: no direct browser selection

## Invitation Edge Functions

Create:

- `supabase/functions/create-invite/`
- `supabase/functions/accept-invite/`
- `supabase/functions/revoke-invite/`

Validate methods, JSON, bearer tokens, authenticated users, CORS, and errors. Never log tokens or secrets.

Create invite:

- Owner only
- Group not full
- Cryptographically secure token
- Store SHA-256 hash only
- Seven-day expiration
- Return raw token once

Accept invite:

- Authenticated user
- Hash token server-side
- Reject expired, revoked, used, self, and full-group cases
- Add membership and mark accepted atomically
- Return group ID
- Safe retry for existing membership

Revoke invite:

- Owner only
- Preserve audit history

Invitation route:

`#/invite/:token`

Use Web Share with clipboard fallback. Keep pending token only in `sessionStorage`.

## Shared deck and swipes

Both users see the same group listing snapshots and criteria. Exclude only the current user's reviewed homes. Never remove a card because the partner reviewed it.

Display:

> Your choices stay private unless you both Love the same home.

Use optimistic UI with rollback and duplicate-submit prevention.

Undo is allowed before a match. After a match, disable Undo and explain:

> This home is already a shared match. Archive it from Matches instead.

## House Match celebration

Create an original accessible modal or mobile panel.

# It's a House Match!

**You both loved this home.**

Include image, address, price, score, reason, names/initials, date, View Match, and Keep Swiping.

Use original house/key/nest/roofline/heart visuals. Do not use Tinder flames or copied styling.

Requirements:

- Focus trap
- Escape close
- Focus restoration
- ARIA announcement
- Reduced-motion behavior
- No reliance on color or animation

## Realtime and notifications

Subscribe narrowly to the current user's notifications and relevant matches. Never subscribe to all swipes.

On a new House Match:

- Add notification
- Update unread badge
- Show celebration once
- Announce accessibly
- Refresh Matches
- Avoid duplicate display

Clean up channels on group change, sign-out, or unmount.

Notification center includes unread count, property, partner, time, read state, open match, mark read, and mark all read.

Optional browser notifications require explicit user action. Never request permission on page load.

## Pages and routes

Preserve HashRouter.

Suggested routes:

```text
#/
#/sign-in
#/profile
#/groups
#/groups/new
#/group/:groupId
#/group/:groupId/preferences
#/group/:groupId/discover
#/group/:groupId/listing/:listingId
#/group/:groupId/matches
#/invite/:token
#/notifications
#/settings
```

Preserve solo/demo routes where useful.

Update the landing page around collaboration:

> Invite your person, review the same homes independently, and discover the properties you both love.

Actions:

- Start a shared search
- Try Couple Match Demo
- Continue solo

## Local migration

Do not erase Version 1 local data.

Use versioned keys for demo groups, swipes, matches, and notifications.

On first connected use, offer:

- Import criteria only
- Import criteria and the current user's Loved/Maybe decisions
- Start new

Never upload local data automatically.

## Security, accessibility, and fair housing

- No real secrets committed
- No service-role key in browser code
- No `dangerouslySetInnerHTML`
- Validate external HTTP(S) links
- No advertising or analytics trackers
- No geolocation collection
- Clear protected state after sign-out
- Sanitized errors
- WCAG 2.1 AA practices
- Keyboard alternatives
- Reduced motion
- Focus management
- Touch targets and contrast

Do not collect or score protected classes, demographic data, neighborhood composition, or proxies.

## Tests

Preserve all existing tests.

Add tests for:

- Love + Love match
- All other decision combinations do not match
- Duplicate Love idempotence
- Hidden partner decisions
- Demo hidden partner and match
- Undo before and after match
- Invitation URL and pending-token handling
- Notification deduplication and unread count
- Missing Supabase fallback
- Auth and group components
- Invitation states
- Celebration and reduced motion
- Notification UI
- Matches states
- Mocked repository behavior
- RLS tests with two users
- Nonmember and third-member rejection
- Direct match/notification spoofing rejection

Never remove tests or bypass CI.

## GitHub Pages and documentation

The build must succeed when Supabase variables are empty.

Preserve lint, tests, TypeScript, Vite build, artifact upload, and deploy.

Verify `dist/index.html` uses compiled assets and works under `/NestMatch/`.

Update README and create `docs/SUPABASE_SETUP.md` with authentication, migrations, RLS, Edge Functions, Realtime, GitHub variables, two-user testing, troubleshooting, security, fair housing, and limitations.

## Out of scope

Do not partially implement groups larger than two, agents, chat/comments, tours, offers, mortgage flows, SMS, offline push, automated email notifications, native apps, full maps, commute analysis, demographic recommendations, payments, or market forecasts.

## Required phased delivery

Do not implement all phases in one task.

### Phase 1 — Collaborative Demo and UI foundation

Implement repository abstraction, local demo collaboration, hidden simulated partner decisions, collaborative landing, group-style demo, privacy notice, local House Matches, accessible celebration, demo Matches dashboard, local notifications, routes, and tests. Preserve solo mode and GitHub Pages. No live Supabase calls.

### Phase 2 — Supabase schema, auth, RLS, and invitations

Implement Supabase configuration, Magic Link PKCE, profiles, migrations, RLS, match trigger, Edge Functions, invitation flow, SQL/RLS tests, and setup docs.

### Phase 3 — Connected shared collaboration

Implement groups, shared criteria/listing snapshots, private connected swipes, match handling, Realtime notifications, connected Matches, safe Undo, recovery states, and a documented two-user test.

### Phase 4 — Production hardening

Implement notification polish, optional browser notifications, local-data import choices, accessibility/responsive/security review, docs completion, and final regressions.

Each phase should be a separate pull request.

## Validation for every phase

Run:

```bash
npm install
npm run lint
npm run test
npm run build
```

Confirm:

- Existing and new tests pass
- Lint passes
- TypeScript passes
- `dist/index.html` exists and references compiled assets
- No secrets are committed
- No safeguards are bypassed
- No unrelated rewrite occurs

PR body must include phase, behavior, architecture, files, test/lint/build results, security checks, setup required, and limitations.
