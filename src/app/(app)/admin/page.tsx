import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getActiveHackathon } from "@/lib/hackathon";

export const dynamic = "force-dynamic";

type Row = {
  team_id: string;
  team_name: string;
  team_locked: boolean;
  status: "draft" | "submitted";
  submitted_at: string | null;
  project_name: string | null;
  description: string | null;
  pitch_url: string | null;
  pitch_video_url: string | null;
  demo_video_url: string | null;
  github_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  image_path: string | null;
  members: Array<{ email: string; full_name: string | null; is_leader: boolean }>;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const gate = await requireAdmin();
  if (!gate.ok) notFound();

  const hackathon = await getActiveHackathon();
  if (!hackathon) notFound();

  const params = await searchParams;
  const statusFilter = params.status === "draft" || params.status === "submitted" ? params.status : null;
  const search = (params.q ?? "").trim().toLowerCase();

  // Service-role client: this page must read across all teams, which RLS
  // would forbid. We're already gated to admin emails above.
  const admin = await createServiceRoleClient();

  const { data: teams } = await admin
    .from("teams")
    .select(
      `
      id, name, locked, hackathon_id,
      submissions(project_name, description, pitch_url, pitch_video_url, demo_video_url, github_url, twitter_url, website_url, image_path, status, submitted_at),
      team_members(invited_email, is_leader, status, users(email, full_name))
      `,
    )
    .eq("hackathon_id", hackathon.id)
    .order("name", { ascending: true });

  type SubRow = Row extends infer R
    ? Omit<R, "team_id" | "team_name" | "team_locked" | "members">
    : never;
  type MemberRow = {
    invited_email: string;
    is_leader: boolean;
    status: string;
    users: { email: string; full_name: string | null } | { email: string; full_name: string | null }[] | null;
  };

  const rows: Row[] = (teams ?? []).map((t) => {
    const sub = Array.isArray(t.submissions) ? t.submissions[0] : (t.submissions as SubRow | null);
    const mrows = (t.team_members ?? []) as MemberRow[];
    const members = mrows
      .filter((m) => m.status === "accepted")
      .map((m) => {
        const u = Array.isArray(m.users) ? m.users[0] : m.users;
        return {
          email: u?.email ?? m.invited_email,
          full_name: u?.full_name ?? null,
          is_leader: m.is_leader,
        };
      });

    return {
      team_id: t.id,
      team_name: t.name,
      team_locked: t.locked,
      status: (sub?.status as "draft" | "submitted") ?? "draft",
      submitted_at: sub?.submitted_at ?? null,
      project_name: sub?.project_name ?? null,
      description: sub?.description ?? null,
      pitch_url: sub?.pitch_url ?? null,
      pitch_video_url: sub?.pitch_video_url ?? null,
      demo_video_url: sub?.demo_video_url ?? null,
      github_url: sub?.github_url ?? null,
      twitter_url: sub?.twitter_url ?? null,
      website_url: sub?.website_url ?? null,
      image_path: sub?.image_path ?? null,
      members,
    };
  });

  const filtered = rows.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const hay = `${r.team_name} ${r.project_name ?? ""} ${r.members.map((m) => m.email + " " + (m.full_name ?? "")).join(" ")}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const counts = {
    total: rows.length,
    submitted: rows.filter((r) => r.status === "submitted").length,
    draft: rows.filter((r) => r.status === "draft").length,
  };

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge tone="yellow">Painel da curadoria</Badge>
            <h1 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">Projetos submetidos</h1>
            <p className="mt-1 text-bh-muted">
              Visão somente-leitura de todos os times do hackathon.
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Stat label="Total" value={counts.total} />
            <Stat label="Submetidos" value={counts.submitted} tone="emerald" />
            <Stat label="Rascunhos" value={counts.draft} tone="neutral" />
          </div>
        </header>

        <Card className="p-5">
          <form className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Buscar por time, projeto, e-mail…"
              className="flex-1 rounded-xl border border-bh-border bg-bh-surface-2 px-4 py-2 text-sm focus:border-bh-violet focus:outline-none"
            />
            <select
              name="status"
              defaultValue={statusFilter ?? ""}
              className="rounded-xl border border-bh-border bg-bh-surface-2 px-3 py-2 text-sm focus:border-bh-violet focus:outline-none"
            >
              <option value="">Todos os status</option>
              <option value="submitted">Apenas submetidos</option>
              <option value="draft">Apenas rascunhos</option>
            </select>
            <button
              type="submit"
              className="rounded-full bg-bh-violet px-4 py-2 text-sm font-medium text-white hover:bg-bh-violet-strong"
            >
              Aplicar
            </button>
          </form>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          {filtered.map((r) => (
            <SubmissionCard key={r.team_id} row={r} />
          ))}
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-bh-muted">
              Nenhum time corresponde ao filtro.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "violet" }: { label: string; value: number; tone?: "violet" | "emerald" | "neutral" }) {
  const colors = {
    violet: "text-bh-text",
    emerald: "text-emerald-300",
    neutral: "text-bh-muted",
  };
  return (
    <div className="rounded-xl border border-bh-border bg-bh-surface-2 px-4 py-2">
      <p className={`font-heading text-lg font-bold ${colors[tone]}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-bh-muted">{label}</p>
    </div>
  );
}

function SubmissionCard({ row }: { row: Row }) {
  const imageUrl = row.image_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/project-images/${row.image_path}`
    : null;

  return (
    <Card className="overflow-hidden">
      <div className="relative h-44 w-full bg-bh-surface-2">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={row.project_name ?? row.team_name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-bh-muted">Sem imagem</div>
        )}
        <div className="absolute right-3 top-3">
          <Badge tone={row.status === "submitted" ? "emerald" : "neutral"}>
            {row.status === "submitted" ? "Submetido" : "Rascunho"}
          </Badge>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-bh-muted">{row.team_name}</p>
          <h3 className="mt-1 font-heading text-lg font-semibold text-bh-text">
            {row.project_name ?? <span className="text-bh-muted">— sem nome —</span>}
          </h3>
          {row.description && (
            <p className="mt-2 line-clamp-4 text-sm text-bh-muted">{row.description}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {row.github_url && <LinkChip label="GitHub" href={row.github_url} />}
          {row.pitch_url && <LinkChip label="Deck" href={row.pitch_url} />}
          {row.pitch_video_url && <LinkChip label="Pitch" href={row.pitch_video_url} />}
          {row.demo_video_url && <LinkChip label="Demo" href={row.demo_video_url} />}
          {row.website_url && <LinkChip label="Site" href={row.website_url} />}
          {row.twitter_url && <LinkChip label="X" href={row.twitter_url} />}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-bh-muted">Time</p>
          <ul className="mt-1 space-y-1 text-sm">
            {row.members.map((m) => (
              <li key={m.email} className="text-bh-text">
                {m.full_name ?? m.email}
                {m.is_leader && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-stbr-yellow">
                    líder
                  </span>
                )}
                <span className="ml-2 text-xs text-bh-muted">{m.email}</span>
              </li>
            ))}
          </ul>
        </div>

        {row.submitted_at && (
          <p className="text-xs text-bh-muted">
            Submetido em{" "}
            {new Intl.DateTimeFormat("pt-BR", {
              timeZone: "America/Sao_Paulo",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(row.submitted_at))}
          </p>
        )}
      </div>
    </Card>
  );
}

function LinkChip({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-full border border-bh-border bg-bh-surface-2 px-3 py-1 text-xs font-medium text-bh-text transition-colors hover:border-bh-violet hover:text-bh-violet"
    >
      {label} ↗
    </Link>
  );
}
