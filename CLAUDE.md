# BH Onchain Hackathon — Submission Platform

Next.js 16 App Router, TypeScript, Tailwind v4, Supabase. Submission flow for the Hackathon BH Onchain (Solana SuperTeam track, May 2026).

## Quick reference

- `npm run dev` — start dev server
- `npm test` — run vitest tests
- `npm run build` — production build (catches type errors)
- Design spec: `docs/superpowers/specs/2026-05-14-bh-onchain-submission-design.md`

## Architecture

- **Route groups:** `(public)/` = no auth, `(app)/` = auth required. Middleware gates auth — do NOT add auth checks in `(app)/layout.tsx` (causes redirect loops).
- **Supabase clients:**
  - `createClient()` (browser) — user-scoped, RLS-enforced.
  - `createServerSupabaseClient()` (server) — same scoping, used in server components and route handlers.
  - `createServiceRoleClient()` — bypasses RLS. Only for invite-token issuance, cron auto-lock, and reading invites for unauthenticated users on `/invite/[token]`.
- **Cross-table mutations** go through `SECURITY DEFINER` RPCs with explicit `auth.uid()` checks: `create_team_with_leader`, `accept_team_invite`, `submit_team`. Single-table RLS handles everything else.
- **Auto-rows via triggers:** inserting a team creates the submission row and the leader's `team_members` row. Inserting an `auth.users` row creates the mirror `users` row.

## Conventions

- **Language:** UI copy in Portuguese (pt-BR). Routes and code in English.
- **Brand:** BH Onchain purple background + gradient with Superteam BR yellow/emerald accents. Tokens are in `@theme` in `src/app/globals.css`.
- **Typography:** Outfit headings, Inter body — both via `next/font/google`.
- **Supabase queries:** use `.maybeSingle()` over `.single()` — `.single()` throws on 0 rows.
- **Dynamic pages:** every `(app)/` page exports `dynamic = 'force-dynamic'`.
- **No code comments** by default. If you write one, explain WHY, not WHAT.

## Gotchas

- `create-next-app` fails in non-empty dirs. The project was scaffolded by hand (mirroring `superteam-maker`'s approach).
- Supabase Auth doesn't backfill the `users` mirror table for accounts that existed before the trigger was added. For a fresh project this won't bite, but if you re-apply migrations to a DB with pre-existing auth users:
  ```sql
  INSERT INTO public.users (id, email)
  SELECT id, email FROM auth.users au
  WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = au.id);
  ```
- `tsconfig.json` and `next-env.d.ts` are managed by Next.js — let it rewrite them on build.
- Image upload uses the public `project-images` bucket. RLS policy keys upload paths to `{team_id}/...`, so callers MUST prefix the team id (the `ImageUpload` component does this).
- Luma "verification" is self-attestation (`users.luma_registered_at`). Cross-reference manually with a CSV export from the Luma organizer dashboard.
- Cron endpoint at `/api/cron/lock-submissions` is bearer-auth'd via `CRON_SECRET`. Vercel sends `Authorization: Bearer <secret>` when configured.

## Testing

- Unit tests in `src/lib/__tests__/`. Covers token sign/verify + URL/text/email sanitizers.
- No DB integration tests — RPCs are exercised manually before the event. Add tests around `submit_team` validation if the event runs again.
