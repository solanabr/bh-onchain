# BH Onchain Hackathon — Submission Platform

**Date:** 2026-05-14
**Owner:** Solana Superteam BR / BH Onchain
**Event:** Hackathon BH Onchain — Solana SuperTeam track, 13–17 May 2026
**Status:** Design

---

## 1. Purpose

A single-purpose web app where hackathon participants:

1. Sign up / sign in (Google or email magic link).
2. Fill a lightweight profile (name, socials, github).
3. Form a team of 1–4 members (leader invites by email).
4. Submit one project per team — name, description, links, image — and edit until the deadline.
5. After the deadline the submission auto-locks and goes to the judges.

Inspiration: Colosseum hackathon submission flow. Codebase patterns: cloned from the existing `superteam-maker` (Next.js 16 App Router + Supabase). Brand: BH Onchain dark-purple aesthetic with Superteam BR accents.

---

## 2. Out of scope

- Matchmaking (this is a submission app, not a team-formation app — teams are formed manually by the leader).
- Judging UI (judges receive a read-only export).
- Payments / NFT minting / on-chain identity.
- Mobile-native app — responsive web only.
- Notifications service (we deliver emails only at two moments: invite + submission confirmation). No bell, no preferences.

---

## 3. User stories

| Role | Story |
|---|---|
| Hacker | Sign in, see the rules, submit my project, edit it any time before the deadline. |
| Team leader | Create the team, invite up to 3 teammates by email, edit the submission. |
| Teammate | Accept an email invite, view & edit the team's submission. |
| Organizer (admin) | Browse all submissions in a read-only dashboard; export to CSV. |
| Judge | Receive the export — no direct UI access yet. |

---

## 4. Architecture

### 4.1 Stack

- **Next.js 16** App Router, React 19, TypeScript
- **Supabase**: Postgres + Auth + Storage (RLS-enforced)
- **Tailwind CSS v4** (`@theme` tokens, no `tailwind.config.ts` needed)
- **Resend** for transactional email (team invites + submission confirmation)
- **Vitest** for tests
- **Vercel** deploy target

Mirroring the `superteam-maker` repo conventions documented in its `CLAUDE.md`.

### 4.2 Route groups

```
src/app/
├── (public)/              # no auth — landing + auth + invite acceptance
│   ├── page.tsx           # landing (hackathon info from regulamento.md)
│   ├── auth/page.tsx      # login / signup
│   ├── auth/callback/     # OAuth callback
│   └── invite/[token]/    # accept team invite from email
├── (app)/                 # auth-gated
│   ├── layout.tsx         # shared chrome (header, footer)
│   ├── onboarding/        # first-time profile setup
│   ├── dashboard/         # team status or "create/join a team" CTA
│   ├── team/              # team page (members, invites)
│   └── submission/        # the submission form (save / submit)
├── api/
│   ├── invite/accept/     # POST: accept invite token
│   └── submit/            # POST: finalize submission (locks)
├── layout.tsx
└── globals.css
```

Middleware (`/middleware.ts`) gates auth, exactly like `superteam-maker`: any non-public route without a session redirects to `/auth`.

### 4.3 Data model

```sql
-- mirror auth.users (auto-created by trigger)
users (
  id uuid pk references auth.users on delete cascade,
  email text unique not null,
  full_name text,
  github_url text,
  twitter_url text,
  linkedin_url text,
  avatar_url text,
  luma_registered_at timestamptz,  -- self-attested, with audit timestamp
  created_at timestamptz default now()
)

hackathons (
  id uuid pk default gen_random_uuid(),
  slug text unique not null,          -- e.g. 'bh-onchain-2026'
  name text not null,
  starts_at timestamptz not null,
  submission_deadline_at timestamptz not null,
  presential_at timestamptz not null, -- 17 May
  luma_url text,
  metadata jsonb default '{}'         -- prize structure, etc.
)

teams (
  id uuid pk default gen_random_uuid(),
  hackathon_id uuid not null references hackathons on delete cascade,
  name text not null,
  leader_id uuid not null references users,
  locked boolean not null default false,  -- true once final-submitted or deadline passed
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (hackathon_id, name)
)

team_members (
  id uuid pk default gen_random_uuid(),
  team_id uuid not null references teams on delete cascade,
  user_id uuid references users,        -- null while invite pending
  invited_email text not null,
  status text not null default 'pending' check (status in ('pending','accepted','removed')),
  is_leader boolean default false,
  invite_token text unique,             -- HMAC-signed magic-link token
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  unique (team_id, invited_email)
)
-- a user can only be active on one team per hackathon
create unique index uniq_team_members_one_per_user_per_hack
  on team_members (user_id, (select hackathon_id from teams where teams.id = team_members.team_id))
  where status = 'accepted';

submissions (
  id uuid pk default gen_random_uuid(),
  team_id uuid unique not null references teams on delete cascade,
  project_name text,
  description text,
  pitch_url text,                 -- deck (PDF or slides) link
  pitch_video_url text,           -- ≤3 min
  demo_video_url text,            -- ≤3 min
  github_url text,
  twitter_url text,
  website_url text,
  image_path text,                -- supabase storage path
  status text not null default 'draft' check (status in ('draft','submitted')),
  submitted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)
```

**RLS policies** (per-table):

- `users`: each user reads/writes their own row; teammates can read each other's `full_name`, `github_url`, `avatar_url`.
- `teams`: any active member can read; only the leader can update name / delete (delete only while no accepted members beyond self).
- `team_members`: members of the same team can read; leader can insert/delete pending invites; user can update own row to accept invite.
- `submissions`: any active member of the owning team can read/write while `status='draft'` and the hackathon's `submission_deadline_at` is in the future. After deadline → read-only.

**Storage bucket**: `project-images` — public read, write requires `auth.uid()` is a member of a team that owns the path `{team_id}/{filename}`.

### 4.4 Auth flow

1. Public landing → "Garanta seu lugar" CTA → `/auth`.
2. `/auth` shows Google OAuth + email magic link (same component as `superteam-maker`).
3. Successful auth → `/auth/callback` → checks if `users.full_name` is set:
   - Empty → redirect `/onboarding`.
   - Set → redirect `/dashboard`.
4. Middleware sends any unauth user to `/auth` for `(app)/*`.

### 4.5 Team lifecycle

```
no team                                  ← /dashboard offers "Criar time" or "Entrar com convite"
   ↓ leader fills name
team (1 member, leader)                  ← invite emails to up to 3 others
   ↓ invitee clicks email link → accepts
team (2–4 members)                       ← leader can remove pending or accepted (≠ self) members
   ↓ team works on submission             ← /submission editable by any member
   ↓ leader clicks "Submeter projeto"
team locked (status='submitted')         ← read-only for everyone
```

Edge cases:
- Deadline passes → cron flips all draft submissions to `submitted` automatically, `locked=true`.
- Member tries to join a second team → blocked by unique index, friendly error.
- Invite token expired (>72h) → leader can resend.

### 4.6 Submission editor

Single page (`/submission`) with all fields. Two buttons:

- **Salvar rascunho** — every change persists to `submissions` (`status='draft'`). No required-fields enforcement.
- **Submeter projeto** — validates required fields (name, description, pitch_url, demo_video_url, github_url, image), confirms with the user ("Você não poderá editar depois"), then sets `status='submitted'`.

Auto-save the description/name on blur to reduce data loss. Show a "Última edição há X minutos por Y" footer so teammates can see edits.

### 4.7 Luma verification

Luma's public API does not expose attendee lists for a given event URL without an API key tied to that event. We don't own the Luma event, so we take a pragmatic approach:

- The onboarding step requires checking a box: "Estou inscrito no Luma do BH Onchain — [abrir Luma](https://luma.com/2teevtax)".
- We record `luma_registered_at = now()` and the user's email.
- An admin can later cross-reference the email list with a CSV export from the Luma organizer.

This is what the user asked for: "we need to make sure the user is registered on the luma". We surface the link prominently and gate submission on the attestation; we don't lie about cryptographically verifying it.

### 4.8 Admin (light-touch)

A `/admin` route gated by `ADMIN_EMAIL_ALLOWLIST` (same env-based pattern as `superteam-maker`). Shows a table of submissions with filters and a CSV export button. Skip a full dashboard until we need one.

---

## 5. Brand and visual language

### 5.1 Palette

Hybrid of BH OnChain (dark purple) and Superteam BR (yellow / emerald accents):

```css
--color-bh-bg:        #0c0820;  /* near-black violet, the BH page background */
--color-bh-surface:   #14102a;  /* card / section */
--color-bh-border:    #2a1f4f;
--color-bh-violet:    #7c3aed;  /* primary action */
--color-bh-fuchsia:   #c026d3;  /* gradient companion */
--color-bh-text:      #ede9fe;  /* main copy */
--color-bh-muted:     #a89fc7;
/* Superteam BR co-brand accents */
--color-stbr-emerald: #008b4c;
--color-stbr-yellow:  #ffd23f;
--color-stbr-offwhite:#f5e8ca;
```

Default CTA: BH violet → fuchsia gradient. Co-brand accent for success states / "winner" highlights: Superteam yellow. Co-organizer mark in footer: Superteam emerald.

### 5.2 Typography

- **Heading:** Outfit (variable, weights 500–700) — matches BH Onchain's site headings.
- **Body:** Inter — neutral, ships with the existing stack.

Both via `next/font/google`. The Outfit `.zip` in `branding/bh/Fonts/` is provided but Google Fonts is cleaner.

### 5.3 Logo lockup

Header shows the BH Onchain horizontal logo on the left; the Superteam Brasil mark sits in the footer as "Curadoria e premiação por Solana Superteam BR" with a wordmark. Both logos are copied into `public/brand/`.

---

## 6. Non-functional

- **Performance:** Server components for the landing + read-heavy pages; client components only for the auth and submission forms.
- **Mobile:** Fully responsive — most hackers will fill the submission on a laptop, but the landing and invite acceptance must work on phones.
- **Locale:** UI in Portuguese (pt-BR), routes + code in English. Match `superteam-maker` convention.
- **Errors:** Anything that hits Supabase logs to console + a `logError()` helper (no Sentry until we have a budget).
- **Tests:** Vitest unit tests for the invite-token sign/verify helper, the submission validator, and the deadline-lock cron handler. No DB integration tests.

---

## 7. Decisions / tradeoffs

| Decision | Rejected alternative | Why |
|---|---|---|
| Single-page submission editor | Multi-step wizard | Fewer than 8 fields; hackers prefer one scrollable page. |
| Email invites (HMAC token) | "Join by code" | Email gives us an audit trail and matches the Luma list pattern. |
| Self-attested Luma registration | Luma API integration | Luma doesn't expose attendee lists for events we don't own. |
| Cron auto-lock at deadline | Manual admin lock | We won't be online at midnight; cron is reliable. |
| RLS for everything | API-only with service role | Less code; Supabase patterns the team already knows. |
| Reuse `superteam-maker` look-and-feel components | Build from scratch | Time pressure (event is in 6 days). |

---

## 8. Open questions (parked, not blocking)

1. Final deadline timestamp — we'll use 17 May 23:59 BRT in `hackathons.submission_deadline_at` and adjust later via SQL.
2. Whether to email all members on each save — likely no, just on final submit.
3. Whether to allow a member to change which team they're on — for now: one team per user per hackathon, leaders cannot transfer the team.

These can be resolved during implementation by reading the existing rules text or a quick check-in with the organizers.

---

## 9. Implementation phases

The implementation plan (separate doc, `2026-05-14-bh-onchain-submission-plan.md`) breaks this into:

1. **Scaffold** — Next.js, Supabase, Tailwind, brand assets.
2. **Auth + onboarding** — sign-in, callback, profile setup, Luma attestation.
3. **Teams** — create team, invite by email, accept invite.
4. **Submission editor** — fields, save, image upload, validation, lock.
5. **Deadline cron** — auto-lock at deadline.
6. **Admin export** — CSV download for the judges.
7. **Polish** — landing, copy, mobile review, deploy to Vercel.
