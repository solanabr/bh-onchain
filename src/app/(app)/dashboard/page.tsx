import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/ui/countdown";
import { getActiveHackathon, isSubmissionWindowOpen } from "@/lib/hackathon";
import { getCurrentUserTeam } from "@/lib/team";
import { requireUser } from "@/lib/user-state";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const state = await requireUser();
  if (!state.profile?.full_name || !state.profile?.luma_registered_at) {
    redirect("/onboarding");
  }
  const hackathon = await getActiveHackathon();
  if (!hackathon) {
    return (
      <div className="px-4 py-16 text-center text-bh-muted">
        Hackathon não encontrado. Avise a organização.
      </div>
    );
  }

  const snapshot = await getCurrentUserTeam(state.userId, hackathon.id);
  const open = isSubmissionWindowOpen(hackathon);

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge tone={open ? "emerald" : "neutral"}>
              {open ? "Submissões abertas" : "Submissões encerradas"}
            </Badge>
            <h1 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">
              Olá, {state.profile.full_name?.split(" ")[0]}.
            </h1>
            <p className="mt-1 text-bh-muted">
              {hackathon.name}
            </p>
          </div>
          <Card className="px-5 py-3">
            <p className="text-xs uppercase tracking-wider text-bh-muted">Encerra em</p>
            <p className="font-heading text-xl font-bold text-bh-text">
              <Countdown deadlineIso={hackathon.submission_deadline_at} />
            </p>
          </Card>
        </header>

        {snapshot ? <TeamPanel snapshot={snapshot} /> : <NoTeamPanel canCreate={open} />}
      </div>
    </div>
  );
}

function NoTeamPanel({ canCreate }: { canCreate: boolean }) {
  return (
    <Card className="p-8">
      <h2 className="font-heading text-xl font-semibold">Você ainda não está em um time</h2>
      <p className="mt-2 text-bh-muted">
        Crie um time como líder, ou peça ao líder do seu time para te adicionar pelo e-mail
        que você usa aqui. Cada time pode ter de 1 a 4 integrantes.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {canCreate ? (
          <Link href="/team/new">
            <Button variant="primary">Criar time</Button>
          </Link>
        ) : (
          <Button variant="primary" disabled>
            Período encerrado
          </Button>
        )}
        <a href="https://luma.com/2teevtax" target="_blank" rel="noreferrer">
          <Button variant="secondary">Reabrir Luma</Button>
        </a>
      </div>
    </Card>
  );
}

import type { TeamSnapshot } from "@/lib/team";

function TeamPanel({ snapshot }: { snapshot: TeamSnapshot }) {
  const { team, members, submission, isLeader } = snapshot;
  const acceptedMembers = members.filter((m) => m.status === "accepted");
  const pendingMembers = members.filter((m) => m.status === "pending");

  return (
    <div className="space-y-6">
      <Card className="p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge tone={team.locked ? "neutral" : "violet"}>
              {team.locked ? "Bloqueado" : "Em edição"}
            </Badge>
            <h2 className="mt-3 font-heading text-2xl font-bold">{team.name}</h2>
            {team.description && <p className="mt-2 text-sm text-bh-muted">{team.description}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-bh-muted">Submissão</p>
            <p className="font-heading text-lg font-semibold text-bh-text">
              {submission.status === "submitted" ? "Submetida" : "Rascunho"}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/submission">
            <Button variant="primary" fullWidth>
              {team.locked ? "Ver submissão" : "Editar submissão"}
            </Button>
          </Link>
          <Link href="/team">
            <Button variant="secondary" fullWidth>
              Gerenciar time
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="p-7">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg font-semibold">Time ({acceptedMembers.length}/4)</h3>
          {isLeader && !team.locked && (
            <Link href="/team" className="text-sm text-bh-violet hover:underline">
              Convidar
            </Link>
          )}
        </div>
        <ul className="mt-4 divide-y divide-bh-border">
          {acceptedMembers.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-bh-text">
                  {m.user?.full_name ?? m.invited_email}
                  {m.is_leader && (
                    <span className="ml-2 text-xs uppercase tracking-wider text-stbr-yellow">Líder</span>
                  )}
                </p>
                <p className="text-xs text-bh-muted">{m.user?.email ?? m.invited_email}</p>
              </div>
            </li>
          ))}
          {pendingMembers.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-bh-muted">{m.invited_email}</p>
                <p className="text-xs text-bh-muted">Convite pendente</p>
              </div>
              <Badge tone="neutral">Pendente</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
