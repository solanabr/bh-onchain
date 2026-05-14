import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-bh-border bg-bh-surface/80 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}
