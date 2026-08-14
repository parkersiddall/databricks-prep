"use client";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";

/** Warn when under two minutes remain. */
const LOW_TIME_MS = 120_000;

export function RunnerHeader({
  title,
  answeredCount,
  total,
  remainingMs,
  studyMode,
  exitHref,
}: {
  title: string;
  answeredCount: number;
  total: number;
  /** Null when the sitting is untimed. */
  remainingMs: number | null;
  studyMode: boolean;
  /** Start / resume screen for this sitting, e.g. after exiting mid-attempt. */
  exitHref: string;
}) {
  const low = remainingMs !== null && remainingMs <= LOW_TIME_MS;

  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>

        {remainingMs !== null && (
          <p
            // Announced periodically rather than on every tick.
            aria-live="polite"
            aria-atomic="true"
            className={`font-mono text-lg tabular-nums ${
              low ? "text-danger" : "text-foreground"
            }`}
          >
            <span className="sr-only">Time remaining: </span>
            {formatDuration(remainingMs)}
          </p>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted">
          {answeredCount} of {total} answered
        </p>
        {studyMode && <Badge tone="primary">Study mode</Badge>}
        {remainingMs === null && <Badge>Untimed</Badge>}
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answeredCount}
        aria-label="Questions answered"
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface"
      >
        <div
          className="h-full bg-primary transition-[width]"
          style={{
            width: `${total === 0 ? 0 : (answeredCount / total) * 100}%`,
          }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-xs text-muted">
          Progress saves automatically — resume anytime.
        </p>
        <ButtonLink href={exitHref} variant="ghost" size="sm">
          Exit
        </ButtonLink>
      </div>
    </header>
  );
}
