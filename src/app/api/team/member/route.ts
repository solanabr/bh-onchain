import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.memberId !== "string") {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: member } = await supabase
    .from("team_members")
    .select("id, team_id, is_leader, teams!inner(leader_id, locked)")
    .eq("id", body.memberId)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Convite não encontrado." }, { status: 404 });

  const team = Array.isArray(member.teams) ? member.teams[0] : member.teams;
  if (team.leader_id !== user.id) {
    return NextResponse.json({ error: "Apenas o líder pode remover." }, { status: 403 });
  }
  if (team.locked) {
    return NextResponse.json({ error: "Time já submetido." }, { status: 400 });
  }
  if (member.is_leader) {
    return NextResponse.json({ error: "Líder não pode se remover." }, { status: 400 });
  }

  const { error } = await supabase.from("team_members").delete().eq("id", body.memberId);
  if (error) {
    return NextResponse.json({ error: "Falha ao remover." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
