import { resolveAuthenticatedUserState } from "./user-state";

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(email: string | null, userId: string | null): boolean {
  const emails = splitList(process.env.ADMIN_EMAIL_ALLOWLIST);
  const ids = splitList(process.env.ADMIN_USER_ID_ALLOWLIST);
  if (email && emails.includes(email.toLowerCase())) return true;
  if (userId && ids.includes(userId.toLowerCase())) return true;
  return false;
}

export async function requireAdmin() {
  const state = await resolveAuthenticatedUserState();
  if (!state) return { ok: false as const, reason: "unauthenticated" as const };
  if (!isAdmin(state.email, state.userId)) {
    return { ok: false as const, reason: "forbidden" as const };
  }
  return { ok: true as const, state };
}
