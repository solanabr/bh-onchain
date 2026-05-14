import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  // Production must have a configured secret; refuse to run otherwise so we
  // never leave the endpoint open on a misconfigured deploy.
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "cron_secret_not_configured" },
        { status: 503 },
      );
    }
    // Dev / preview: allow without a secret.
  } else {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const admin = await createServiceRoleClient();
  const { data, error } = await admin.rpc("auto_lock_overdue");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, locked: data ?? 0 });
}
