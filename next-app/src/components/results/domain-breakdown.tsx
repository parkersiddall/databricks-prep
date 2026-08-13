import { formatPercent } from "@/lib/format";
import type { DomainBreakdown as DomainBreakdownRow } from "@/lib/grading";

/**
 * Per-objective scores, in exam order. Shows where to focus revision, which is
 * the main thing a practice exam is for.
 */
export function DomainBreakdown({ rows }: { rows: DomainBreakdownRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        By objective
      </h2>

      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.domain}>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="min-w-0">{row.domain}</span>
              <span className="shrink-0 tabular-nums text-muted">
                {row.correctCount}/{row.total} · {formatPercent(row.scorePct)}
              </span>
            </div>
            <div
              aria-hidden="true"
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface"
            >
              <div
                className={`h-full ${
                  row.scorePct >= 70
                    ? "bg-success"
                    : row.scorePct >= 40
                      ? "bg-warning"
                      : "bg-danger"
                }`}
                style={{ width: `${row.scorePct}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
