import type { ReactNode } from "react";

const toneClasses = {
  neutral: "bg-surface text-muted border-border",
  primary: "bg-surface text-primary border-primary/40",
  success: "bg-success-surface text-success border-success/30",
  warning: "bg-warning-surface text-warning border-warning/30",
  danger: "bg-danger-surface text-danger border-danger/30",
} as const;

export type BadgeTone = keyof typeof toneClasses;

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
