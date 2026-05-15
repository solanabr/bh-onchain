-- Per-admin rating on each submission. Composite PK enforces "one row per
-- (submission, admin)". Mutations go through server actions gated by
-- requireAdmin(); RLS is enabled with no policies so any accidental
-- client-side query returns zero rows.

create table public.submission_ratings (
  submission_id uuid not null references public.submissions(id) on delete cascade,
  admin_id uuid not null references public.users(id) on delete cascade,
  grade smallint check (grade is null or (grade between 0 and 10)),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (submission_id, admin_id)
);

create index submission_ratings_admin_id_idx
  on public.submission_ratings(admin_id);

create trigger submission_ratings_touch_updated_at
  before update on public.submission_ratings
  for each row execute function public.touch_updated_at();

alter table public.submission_ratings enable row level security;
