import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "yellow" | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  fullWidth?: boolean;
  children: ReactNode;
};

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-white text-bh-bg font-semibold hover:bg-stbr-off-white disabled:opacity-50 shadow-[0_12px_32px_rgba(255,255,255,0.18)]",
  secondary:
    "border-2 border-bh-violet bg-transparent text-bh-text font-semibold hover:border-bh-fuchsia hover:bg-bh-violet/12 disabled:opacity-50",
  ghost:
    "text-bh-text hover:bg-bh-surface-2 disabled:opacity-50",
  yellow:
    "bg-stbr-yellow text-stbr-dark-green font-semibold hover:brightness-95 disabled:opacity-50",
  danger:
    "bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", fullWidth, className = "", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm transition-all disabled:cursor-not-allowed ${
        VARIANT_CLASSES[variant]
      } ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});
