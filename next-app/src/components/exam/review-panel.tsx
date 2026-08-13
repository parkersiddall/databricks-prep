"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useHydrated } from "@/hooks/use-hydrated";
import { pluralize } from "@/lib/format";
import {
  entriesForTest,
  GRADUATION_STREAK,
  selectReviewQuestionIds,
} from "@/lib/missed-pool";
import { answeredCount as countAnswered, type SessionMode } from "@/lib/session";
import { useMissedStore } from "@/stores/missed";
import { selectSession, useSessionsStore } from "@/stores/sessions";

const SIZE_OPTIONS = [10, 25] as const;

/**
 * Builds a review sitting from the missed-question pool.
 *
 * Review sittings are **untimed** — the point is deliberate practice, not
 * simulating exam pressure — and default to study mode so feedback is immediate.
 * The selected question ids are snapshotted into the session, so the sitting does
 * not reshuffle as answers graduate questions out of the pool.
 */
export function ReviewPanel({
  testId,
  sourceKey,
  takeHref,
  resultsHref,
}: {
  testId: string;
  sourceKey: string;
  takeHref: string;
  resultsHref: string;
}) {
  const router = useRouter();
  const sessionsHydrated = useHydrated(useSessionsStore);
  const missedHydrated = useHydrated(useMissedStore);

  const pool = useMissedStore((state) => state.pool);
  const clearForTest = useMissedStore((state) => state.clearForTest);
  const session = useSessionsStore(selectSession(sourceKey));
  const start = useSessionsStore((state) => state.start);

  const [mode, setMode] = useState<SessionMode>("study");
  const [limit, setLimit] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const begin = () => {
    const questionIds = selectReviewQuestionIds(pool, {
      testId,
      limit: limit ?? undefined,
    });
    if (questionIds.length === 0) return;

    start({
      sourceKey,
      testId,
      questionIds,
      mode,
      timeLimitMs: null,
      now: Date.now(),
    });
    router.push(takeHref);
  };

  if (!sessionsHydrated || !missedHydrated) {
    return (
      <div className="h-40 animate-pulse rounded-lg bg-surface" aria-busy="true" />
    );
  }

  const poolSize = entriesForTest(pool, testId).length;

  if (poolSize === 0 && session === undefined) {
    return (
      <div className="rounded-lg border border-border bg-surface-raised p-5">
        <h2 className="font-medium">Nothing to review yet</h2>
        <p className="mt-2 text-sm text-muted">
          Questions you answer incorrectly in a practice exam collect here, across
          every practice exam in this certification. Sit an exam and any you miss
          will show up.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {session?.status === "in-progress" && (
        <div className="rounded-lg border border-border bg-surface-raised p-5">
          <h2 className="font-medium">Review in progress</h2>
          <p className="mt-2 text-sm text-muted">
            {countAnswered(session)} of {session.questionIds.length} answered.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href={takeHref} variant="primary">
              Resume
            </ButtonLink>
            <Button variant="danger" onClick={() => setConfirmRestart(true)}>
              Discard and rebuild
            </Button>
          </div>
        </div>
      )}

      {session?.status === "submitted" && (
        <div className="rounded-lg border border-border bg-surface-raised p-5">
          <h2 className="font-medium">Last review finished</h2>
          <p className="mt-2 text-sm text-muted">
            Questions you got right twice in a row have left the list.
          </p>
          <ButtonLink href={resultsHref} className="mt-4">
            Review answers
          </ButtonLink>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface-raised p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-medium">
            {session?.status === "in-progress" ? "Start a new review" : "Review"}
          </h2>
          <Badge tone={poolSize > 0 ? "warning" : "neutral"}>
            {pluralize(poolSize, "question")}
          </Badge>
        </div>

        <p className="mt-2 text-sm text-muted">
          A question leaves this list once you answer it correctly{" "}
          {GRADUATION_STREAK} times in a row. Hardest questions come first.
        </p>

        {poolSize === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Your review list is empty — nothing to drill right now.
          </p>
        ) : (
          <>
            <fieldset className="mt-5">
              <legend className="text-xs font-semibold uppercase tracking-wide text-muted">
                How many
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {[...SIZE_OPTIONS.filter((size) => size < poolSize), null].map(
                  (size) => (
                    <Button
                      key={size ?? "all"}
                      size="sm"
                      variant={limit === size ? "primary" : "secondary"}
                      aria-pressed={limit === size}
                      onClick={() => setLimit(size)}
                    >
                      {size ?? `All ${poolSize}`}
                    </Button>
                  ),
                )}
              </div>
            </fieldset>

            <fieldset className="mt-4">
              <legend className="text-xs font-semibold uppercase tracking-wide text-muted">
                Mode
              </legend>
              <div className="mt-2 flex flex-col gap-2">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="radio"
                    name="review-mode"
                    checked={mode === "study"}
                    onChange={() => setMode("study")}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    <span className="font-medium">Study</span>
                    <span className="block text-muted">
                      Feedback after each answer. Answers lock once given.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="radio"
                    name="review-mode"
                    checked={mode === "exam"}
                    onChange={() => setMode("exam")}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    <span className="font-medium">Exam</span>
                    <span className="block text-muted">
                      Answers stay hidden until you submit.
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>

            <p className="mt-4 text-xs text-muted">
              Review sittings are untimed.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="primary" onClick={begin}>
                Start review
              </Button>
              <Button variant="ghost" onClick={() => setConfirmClear(true)}>
                Clear review list
              </Button>
            </div>
          </>
        )}
      </div>

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear your review list?"
        description={`All ${poolSize} questions will be removed from this certification's review list. Your practice exam scores are not affected, and questions you miss in future will start collecting again.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                clearForTest(testId);
                setConfirmClear(false);
              }}
            >
              Clear
            </Button>
          </>
        }
      />

      <Dialog
        open={confirmRestart}
        onClose={() => setConfirmRestart(false)}
        title="Discard this review?"
        description="Your answers in the current review sitting will be discarded. Nothing leaves your review list."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRestart(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirmRestart(false);
                begin();
              }}
            >
              Discard
            </Button>
          </>
        }
      />
    </div>
  );
}
