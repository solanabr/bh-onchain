import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-bh-border/50 bg-bh-bg/85">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-12">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/bh/symbol.png"
                alt=""
                className="h-7 w-8 object-contain"
              />
              <p className="font-heading text-sm font-semibold text-bh-text">
                BH Onchain
              </p>
            </div>
            <p className="text-xs leading-relaxed text-bh-muted">
              Hackathon BH Onchain — Trilha SuperteamBR.
              <br />
              13 a 17 de maio de 2026, Belo Horizonte.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.18em] text-stbr-yellow">
              Organização
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <Image
                src="/brand/bh/wordmark.png"
                alt="BH Onchain"
                width={150}
                height={60}
                className="h-8 w-auto object-contain"
              />
              <span className="h-6 w-px bg-bh-border" aria-hidden="true" />
              <Image
                src="/brand/vega-lockup-wine.png"
                alt="Vega Crypto"
                width={170}
                height={47}
                className="h-7 w-auto object-contain brightness-0 invert"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.18em] text-stbr-yellow">
              Em parceria com
            </p>
            <Image
              src="/brand/stbr/logo/horizontal-fwhite.svg"
              alt="Solana Superteam Brasil"
              width={210}
              height={48}
              className="h-8 w-auto object-contain"
            />
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-bh-border/50 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-bh-muted">
            © 2026 BH Onchain. Realizado por Vega Crypto.
          </p>
          <div className="flex items-center gap-2">
            <SocialLink href="https://x.com/BHonchain" label="BH Onchain no X">
              <path
                d="M13.9 10.5 20.8 2h-1.6l-6 7.4L8.4 2H3l7.2 11.1L3 22h1.6l6.3-7.8 5.1 7.8h5.4l-7.5-11.5Zm-2.2 2.8-.7-1.1L5.2 3.3h2.4l4.7 7.2.7 1.1 6.1 9.3h-2.4l-5-7.6Z"
                fill="currentColor"
              />
            </SocialLink>
            <SocialLink
              href="https://www.linkedin.com/company/bh-onchain/"
              label="BH Onchain no LinkedIn"
            >
              <path
                d="M6.9 21H3.3V9h3.6v12ZM5.1 7.4A2.1 2.1 0 1 1 5.1 3a2.1 2.1 0 0 1 0 4.2ZM21 21h-3.6v-5.8c0-1.4 0-3.1-1.9-3.1s-2.2 1.5-2.2 3V21H9.8V9h3.4v1.6h.1a3.7 3.7 0 0 1 3.3-1.8c3.6 0 4.3 2.4 4.3 5.4V21Z"
                fill="currentColor"
              />
            </SocialLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-bh-border bg-bh-surface/70 text-bh-muted transition hover:border-stbr-yellow/60 hover:text-stbr-yellow"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        {children}
      </svg>
    </a>
  );
}
