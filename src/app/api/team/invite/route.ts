import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { createInviteToken } from "@/lib/tokens";
import { sendInviteEmail } from "@/lib/email";
import { isValidEmail } from "@/lib/security";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.teamId !== "string" || typeof body.email !== "string") {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  const email = body.email.trim().toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  // Verify caller is the leader of this team (and team is unlocked).
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, leader_id, locked")
    .eq("id", body.teamId)
    .maybeSingle();
  if (!team) return NextResponse.json({ error: "Time não encontrado." }, { status: 404 });
  if (team.leader_id !== user.id) {
    return NextResponse.json({ error: "Apenas o líder pode convidar." }, { status: 403 });
  }
  if (team.locked) {
    return NextResponse.json({ error: "Time já submetido." }, { status: 400 });
  }

  // Already invited or member?
  const { data: existing } = await supabase
    .from("team_members")
    .select("id, status")
    .eq("team_id", team.id)
    .ilike("invited_email", email)
    .maybeSingle();

  if (existing && existing.status === "accepted") {
    return NextResponse.json({ error: "Pessoa já está no time." }, { status: 400 });
  }

  // Use service role to insert + return token (RLS allows leader insert,
  // but we want to atomically generate and persist the invite_token).
  const admin = await createServiceRoleClient();
  const tempId = crypto.randomUUID();
  const token = createInviteToken(tempId);

  if (existing) {
    // Re-issue token for pending invite
    const { error } = await admin
      .from("team_members")
      .update({ invite_token: token, invited_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) {
      return NextResponse.json({ error: "Falha ao renovar convite." }, { status: 500 });
    }
  } else {
    const { error } = await admin.from("team_members").insert({
      team_id: team.id,
      invited_email: email,
      status: "pending",
      is_leader: false,
      invite_token: token,
    });
    if (error) {
      return NextResponse.json({ error: "Falha ao criar convite." }, { status: 500 });
    }
  }

  const { data: inviterProfile } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  await sendInviteEmail({
    to: email,
    teamName: team.name,
    inviterName: inviterProfile?.full_name ?? inviterProfile?.email ?? "Seu líder",
    token,
  });

  return NextResponse.json({ ok: true });
}
