/**
 * Shared decorative background — radial glows only. The stack mirrors the
 * BH Onchain main event site (github.com/lucaslimaa2/bh-onchain): three
 * ellipses (purple, blue, pink) at canonical positions + a vertical dim
 * overlay, so this page reads as a chapter of the same brand.
 */
export function GradientBackground({ fullHeight = false }: { fullHeight?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className={`absolute inset-x-0 top-0 ${
          fullHeight ? "h-full min-h-[60rem]" : "h-[60rem]"
        } bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,rgba(105,53,222,0.4),transparent),radial-gradient(ellipse_60%_40%_at_20%_80%,rgba(38,41,224,0.35),transparent),radial-gradient(ellipse_50%_50%_at_80%_60%,rgba(218,43,224,0.25),transparent),linear-gradient(180deg,rgba(10,10,26,0.5)_0%,rgba(10,10,26,0.9)_100%)]`}
      />
      <div className="absolute left-1/2 top-32 h-[28rem] w-[44rem] -translate-x-1/2 rounded-full bg-bh-violet/20 blur-[120px]" />
      <div className="absolute right-[-6rem] top-48 h-72 w-[26rem] rounded-full bg-bh-fuchsia/20 blur-[120px]" />
    </div>
  );
}
