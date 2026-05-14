import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveAuthenticatedUserState } from "@/lib/user-state";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectParam = url.searchParams.get("redirect");

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const state = await resolveAuthenticatedUserState();
  if (!state) {
    return NextResponse.redirect(new URL("/auth?error=auth_failed", url.origin));
  }

  const dest = sanitizeRedirect(redirectParam) ?? state.redirectPath;
  return NextResponse.redirect(new URL(dest, url.origin));
}

/**
 * Allow only internal absolute paths. Reject anything that could resolve to a
 * different origin (`https://evil`, `//evil.com`, or protocol-relative URLs).
 */
function sanitizeRedirect(input: string | null): string | null {
  if (!input) return null;
  if (!input.startsWith("/")) return null;
  if (input.startsWith("//")) return null;
  if (input.startsWith("/\\")) return null;
  return input;
}
