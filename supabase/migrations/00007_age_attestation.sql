-- Records each user's attestation that they're 18+. The regulamento requires
-- all team members to be at least 18 years old; we capture this separately
-- from the Luma confirmation so the two can be audited independently.

alter table public.users
  add column if not exists age_attestation_at timestamptz;
