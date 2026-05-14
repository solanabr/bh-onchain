import type { ReactNode } from "react";

type Tone = "violet" | "fuchsia" | "yellow" | "emerald" | "neutral";

const TONES: Record<Tone, string> = {
  violet: "border-bh-violet/40 bg-bh-violet/10 text-purple-200",
  fuchsia: "border-bh-fuchsia/40 bg-bh-fuchsia/10 text-fuchsia-200",
  yellow: "border-stbr-yellow/40 bg-stbr-yellow/10 text-stbr-yellow",
  emerald: "border-stbr-emerald/50 bg-stbr-emerald/10 text-emerald-200",
  neutral: "border-bh-border bg-bh-surface-2 text-bh-muted",
};

export function Badge({ children, tone = "violet" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
