"use client";

import { AnswerReviewList } from "@/components/results/answer-review-list";
import { DomainBreakdown } from "@/components/results/domain-breakdown";
import { ScoreSummary } from "@/components/results/score-summary";
import { ButtonLink } from "@/components/ui/button";
import { getQuestionsByIds } from "@/content/queries";
import { useHydrated } from "@/hooks/use-hydrated";
import { elapsedAt } from "@/lib/timer";
import { selectSession, useSessionsStore } from "@/stores/sessions";

/**
 * Results for a submitted sitting, read from the persisted session.
 *
 * Generic over the source key, so this serves both practice exams and
 * missed-question review sessions.
 */
export function ResultsView({
  sourceKey,
  passingScorePct,
  startHref,
  backHref,
  backLabel,
}: {
  sourceKey: string;
  passingScorePct: number;
  /** Start / resume screen, offering a retake. */
  startHref: string;
  backHref: string;
  backLabel: string;
}) {
  const hydrated = useHydrated(useSessionsStore);
  const session = useSessionsStore(selectSession(sourceKey));

  if (!hydrated) {
    return (
      <div className="animate-pulse space-y-4" aria-busy="true">
        <div className="h-32 w-full rounded-lg bg-surface" />
        <div className="h-48 w-full rounded-lg bg-surface" />
      </div>
    );
  }

  if (session?.status !== "submitted" || session.result === undefined) {
    return (
      <div className="rounded-lg border border-border bg-surface-raised p-6">
        <h2 className="font-medium">No results yet</h2>
        <p className="mt-2 text-sm text-muted">
          {session === undefined
            ? "This exam has not been started in this browser."
            : "This exam is still in progress. Finish and submit it to see your results."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href={startHref} variant="primary">
            {session === undefined ? "Go to the exam" : "Resume"}
          </ButtonLink>
          <ButtonLink href={backHref}>{backLabel}</ButtonLink>
        </div>
      </div>
    );
  }

  const { result } = session;
  const questions = getQuestionsByIds(session.questionIds);

  return (
    <div className="flex flex-col gap-8">
      <ScoreSummary
        result={result}
        passingScorePct={passingScorePct}
        // `submitSession` pauses the timer, so there is no running stretch to
        // add and the `now` argument cannot affect the total. Passing 0 keeps
        // render pure.
        elapsedMs={elapsedAt(session.timer, session.submittedAt ?? 0)}
        studyMode={session.mode === "study"}
      />

      <DomainBreakdown rows={result.byDomain} />

      <AnswerReviewList questions={questions} outcomes={result.perQuestion} />

      <div className="flex flex-wrap gap-2">
        <ButtonLink href={startHref} variant="primary">
          Retake
        </ButtonLink>
        <ButtonLink href={backHref}>{backLabel}</ButtonLink>
      </div>
    </div>
  );
}
