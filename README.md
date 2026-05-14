# BH Onchain Hackathon — Submission Platform

Submission platform for the **Hackathon BH Onchain · Trilha Solana SuperTeam** (Belo Horizonte, 13–17 May 2026). Hackers sign in, build a team, and submit their project. Edits stay open until the deadline; a cron locks every team after.

Co-organized by [BH Onchain](https://bhonchain.com) and curated by [Solana Superteam BR](https://br.superteam.fun). Inspired by the existing [`superteam-maker`](../superteam-maker) codebase.

## Quick start

```bash
npm install
cp .env.example .env.local        # fill values
npm run dev                       # http://localhost:3000
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build (catches type errors) |
| `npm test` | Run vitest once |
| `npm run lint` | ESLint |

## Tech stack

- Next.js 16 App Router + React 19 + TypeScript
- Supabase (Postgres, Auth, RLS, Storage)
- Tailwind CSS v4 (`@theme` tokens — no `tailwind.config`)
- Resend for transactional email (team invites + submission confirmation)
- Vitest for unit tests
- Vercel deploy + cron

## Environment variables

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | User-scoped client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin key (cron, invite issue) |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL used in invite emails |
| `NEXT_PUBLIC_HACKATHON_LUMA_URL` | Luma event URL surfaced in the UI |
| `RESEND_API_KEY` | Resend API key (email skipped if unset) |
| `EMAIL_FROM` | `"BH Onchain <hackathon@bhonchain.com>"` |
| `INVITE_TOKEN_SECRET` | HMAC key for invite links (`openssl rand -base64 48`) |
| `CRON_SECRET` | Auth bearer for `/api/cron/lock-submissions` |
| `ADMIN_EMAIL_ALLOWLIST` | Comma-separated admin emails (future admin dashboard) |
| `ADMIN_USER_ID_ALLOWLIST` | Comma-separated admin user IDs |

Without `RESEND_API_KEY`, invite/confirmation emails are logged to the console (useful for local dev).

## Architecture

### Route groups

- `(public)/` — landing, auth pages, invite-acceptance magic-link landing.
- `(app)/` — auth-gated: onboarding, dashboard, team, submission editor.
- `api/` — invite send, member remove, cron lock, signout.

Middleware (`/middleware.ts`) gates auth: any non-public route without a session redirects to `/auth`. **Don't add auth checks in `(app)/layout.tsx`** — that path causes redirect loops (we hit this in the parent project too).

### Data model

```
auth.users  ─trigger─>  users (mirror + profile data)
hackathons (seeded with bh-onchain-2026)
teams ─trigger─> submissions + team_members(leader)
team_members  (pending until invitee clicks email link)
```

Three `SECURITY DEFINER` RPCs encapsulate cross-table mutations:

- `create_team_with_leader` — validates the caller isn't already on a team for the hackathon, then inserts the team. Triggers auto-create the submission row and add the leader as `accepted`.
- `accept_team_invite` — atomically attaches the authenticated user to a pending invite, with the same "one team per hackathon" guard.
- `submit_team` — leader-only finalize: validates required fields, flips submission to `submitted`, locks the team.

A fourth (`auto_lock_overdue`) runs from Vercel cron every 15 min to flip overdue draft submissions.

### Auth + onboarding

1. Landing → `/auth` → Google OAuth or magic link.
2. `/auth/callback` exchanges the code and routes to:
   - `/onboarding` if `users.full_name` or `users.luma_registered_at` is missing.
   - `/dashboard` otherwise.
3. Onboarding records `luma_registered_at` after the user checks the Luma confirmation box. The Luma link is surfaced prominently.

### Team lifecycle

```
no team             → /dashboard offers Criar time / Aguardar convite
   ↓ leader fills name
team (1 member)     → leader can invite up to 3 others by email
   ↓ invitee clicks email link → /invite/[token] → accept_team_invite RPC
team (≤ 4 members)  → all members can edit the submission
   ↓ leader clicks Submeter projeto  (submit_team RPC, validates required fields)
team locked         → submission frozen
```

Cron auto-locks any team past the deadline (whether submitted or not — draft becomes the final entry).

### Submission editor

Single page (`/submission`) with all fields. Two buttons:

- **Salvar rascunho** — persists every change with no required-field enforcement.
- **Submeter projeto** — leader-only. Confirms with the user, validates required fields, calls `submit_team`.

The cover image lives in the public Supabase Storage bucket `project-images/{team_id}/{filename}`.

### Luma verification

We don't own the Luma event, so we can't query attendees directly. The user attests (with timestamp) that they're inscribed using the same email they used here. Organizers can later cross-reference the email column with a CSV export from the Luma organizer dashboard.

## Brand

Hybrid BH Onchain (dark purple) + Superteam BR (yellow / emerald accents). See `src/app/globals.css` `@theme` block.

- Logos: `public/brand/bh/*` (PNG) and `public/brand/stbr/*` (SVG).
- Fonts: Outfit (heading) + Inter (body), loaded via `next/font/google`.

## Supabase setup

1. Create a new Supabase project.
2. Apply the migrations in `supabase/migrations/` in order via the SQL editor or the Supabase CLI.
3. Add `NEXT_PUBLIC_APP_URL` to the project's allowed redirect URLs.
4. (Optional) Enable Google OAuth provider in Authentication → Providers.

## Deploy

Vercel — set the env vars, register the cron in `vercel.json` (already present):

```
/api/cron/lock-submissions — every 15 min
```

## Conventions (mirroring superteam-maker)

- **UI copy** in pt-BR. **Code + routes** in English.
- `.maybeSingle()` over `.single()` when a row may not exist.
- `(app)/` pages declare `export const dynamic = 'force-dynamic'` to avoid stale redirects.
- Default to **no code comments**. If one is needed, explain WHY, not WHAT.

## Roadmap

These are pragmatically out of scope for the first event:

- Admin dashboard with CSV export (env-gated `/admin`).
- Realtime presence in the submission editor (Supabase Realtime channel).
- Direct Luma API integration once we own the event.
- Multi-hackathon support — schema already includes `hackathon_id` on teams, but the UI hardcodes `bh-onchain-2026`.
