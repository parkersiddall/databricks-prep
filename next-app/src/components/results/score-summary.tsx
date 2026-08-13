import { Badge } from "@/components/ui/badge";
import { formatDuration, formatPercent, joinMeta } from "@/lib/format";
import type { AttemptResult } from "@/lib/grading";

export function ScoreSummary({
  result,
  passingScorePct,
  elapsedMs,
  studyMode,
}: {
  result: AttemptResult;
  passingScorePct: number;
  elapsedMs: number;
  studyMode: boolean;
}) {
  const blanks = result.total - result.answeredCount;

  return (
    <section className="rounded-lg border border-border bg-surface-raised p-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <p className="text-4xl font-semibold tabular-nums">
          {formatPercent(result.scorePct)}
        </p>
        <Badge tone={result.passed ? "success" : "danger"}>
          {result.passed ? "Pass" : "Below passing"}
        </Badge>
      </div>

      <p className="mt-2 text-sm text-muted">
        {result.correctCount} of {result.total} correct ·{" "}
        {passingScorePct}% needed to pass
      </p>

      <div
        aria-hidden="true"
        className="relative mt-4 h-2 w-full overflow-hidden rounded-full bg-surface"
      >
        <div
          className={`h-full ${result.passed ? "bg-success" : "bg-danger"}`}
          style={{ width: `${result.scorePct}%` }}
        />
        {/* Where the pass mark sits, so a near miss is legible at a glance. */}
        <div
          className="absolute inset-y-0 w-px bg-foreground/50"
          style={{ left: `${passingScorePct}%` }}
        />
      </div>

      <p className="mt-3 text-xs text-muted">
        {joinMeta(
          `Time taken ${formatDuration(elapsedMs)}`,
          blanks > 0 && `${blanks} left blank`,
          studyMode && "Study mode",
        )}
      </p>
    </section>
  );
}
