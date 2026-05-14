import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

const BASE =
  "w-full rounded-xl border border-bh-border bg-bh-surface px-4 py-3 text-bh-text placeholder:text-bh-muted focus:border-bh-violet focus:outline-none focus:ring-2 focus:ring-bh-violet/40 transition-colors";

type InputProps = InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", ...rest },
  ref,
) {
  return <input ref={ref} className={`${BASE} ${className}`} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className = "", rows = 4, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`${BASE} resize-y ${className}`}
      {...rest}
    />
  );
});

export function Label({ children, htmlFor, hint }: { children: React.ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-center justify-between text-sm font-medium text-bh-text">
      <span>{children}</span>
      {hint && <span className="text-xs font-normal text-bh-muted">{hint}</span>}
    </label>
  );
}
