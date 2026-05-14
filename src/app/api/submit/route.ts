import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendSubmissionConfirmation } from "@/lib/email";

const RPC_ERRORS: Record<string, { status: number; message: string }> = {
  not_authenticated: { status: 401, message: "Sessão expirada." },
  not_leader: { status: 403, message: "Apenas o líder pode submeter." },
  team_not_found: { status: 404, message: "Time não encontrado." },
  already_locked: { status: 409, message: "Time já submetido." },
  deadline_passed: { status: 409, message: "Prazo encerrado." },
  missing_required_fields: {
    status: 422,
    message: "Preencha todos os campos obrigatórios (incluindo imagem do projeto).",
  },
  members_missing_luma: {
    status: 422,
    message: "Todos os integrantes precisam confirmar a inscrição no Luma antes de submeter.",
  },
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.teamId !== "string") {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { error: rpcError } = await supabase.rpc("submit_team", { p_team_id: body.teamId });
  if (rpcError) {
    const mapped = RPC_ERRORS[rpcError.message];
    return NextResponse.json(
      { error: mapped?.message ?? "Não foi possível submeter.", code: rpcError.message },
      { status: mapped?.status ?? 500 },
    );
  }

  // Fire-and-forget confirmation emails. Failure here doesn't roll back the submission.
  try {
    const { data: details } = await supabase
      .from("teams")
      .select("name, submissions(project_name), team_members(invited_email, status, user_id, users(email))")
      .eq("id", body.teamId)
      .maybeSingle();

    if (details) {
      type SubRow = { project_name: string | null };
      type MemberRow = { status: string; invited_email: string; users: { email: string } | { email: string }[] | null };
      const sub = Array.isArray(details.submissions) ? details.submissions[0] : (details.submissions as SubRow | null);
      const members = (details.team_members ?? []) as MemberRow[];

      const recipients = new Set<string>();
      for (const m of members) {
        if (m.status !== "accepted") continue;
        const u = Array.isArray(m.users) ? m.users[0] : m.users;
        const email = u?.email ?? m.invited_email;
        if (email) recipients.add(email);
      }

      await Promise.allSettled(
        Array.from(recipients).map((to) =>
          sendSubmissionConfirmation({
            to,
            teamName: details.name,
            projectName: sub?.project_name ?? "Projeto sem nome",
          }),
        ),
      );
    }
  } catch (err) {
    console.warn("[/api/submit] confirmation emails failed", err);
  }

  return NextResponse.json({ ok: true });
}
