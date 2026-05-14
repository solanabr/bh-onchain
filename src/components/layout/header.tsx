"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const primaryAction =
  "inline-flex h-10 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-bh-bg transition hover:bg-stbr-off-white";

const secondaryAction =
  "inline-flex h-10 items-center justify-center rounded-full border-2 border-bh-violet bg-transparent px-5 text-sm font-semibold text-bh-text transition hover:border-bh-fuchsia hover:bg-bh-violet/12";

export function Header({
  isAuthenticated,
  primaryHref,
  isAdmin = false,
  revealOnScroll = false,
}: {
  isAuthenticated: boolean;
  primaryHref: string;
  isAdmin?: boolean;
  revealOnScroll?: boolean;
}) {
  const [revealed, setRevealed] = useState(!revealOnScroll);

  useEffect(() => {
    if (!revealOnScroll) return;
    const onScroll = () => setRevealed(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [revealOnScroll]);

  const headerClass = revealOnScroll
    ? `fixed inset-x-0 top-0 z-40 border-b border-bh-border/45 bg-bh-bg/88 backdrop-blur-xl transition duration-300 ${
        revealed ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`
    : "sticky top-0 z-40 border-b border-bh-border/45 bg-bh-bg/88 backdrop-blur-xl";

  return (
    <header className={headerClass}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center">
          <Image
            src="/brand/bh/wordmark.png"
            alt="BH Onchain"
            width={120}
            height={48}
            className="h-8 w-auto object-contain"
            priority
          />
        </Link>

        <nav className="flex shrink-0 items-center gap-2">
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link href="/admin" className={secondaryAction}>
                  Admin
                </Link>
              )}
              <Link href={primaryHref} className={secondaryAction}>
                Painel
              </Link>
              <form action="/api/auth/signout" method="POST" className="hidden sm:block">
                <button type="submit" className={secondaryAction}>
                  Sair
                </button>
              </form>
            </>
          ) : (
            <Link href="/auth" className={primaryAction}>
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
