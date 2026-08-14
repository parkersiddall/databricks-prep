"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getQuestionsForTest } from "@/content/queries";
import { useHydrated } from "@/hooks/use-hydrated";
import { pluralize } from "@/lib/format";
import { answeredCount as countAnswered } from "@/lib/session";
import { shuffle } from "@/lib/shuffle";
import { selectSession, useSessionsStore } from "@/stores/sessions";

/**
 * Builds a sitting over every question in a test, across all of its practice
 * exams.
 *
 * This is deliberate practice rather than a simulated exam, so a sitting is
 * **untimed, always study mode, and freshly shuffled** — the same bank in the
 * same order would train the sequence instead of the questions. Missed answers
 * still feed the review pool, because study-mode grading applies as each answer
 * lands.
 *
 * The session is not persisted (see stores/sessions.ts), so "in progress" here
 * only ever means the current visit: navigating back from the runner can resume,
 * a reload starts fresh.
 */
export function AllQuestionsPanel({
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
  const hydrated = useHydrated(useSessionsStore);

  const session = useSessionsStore(selectSession(sourceKey));
  const start = useSessionsStore((state) => state.start);

  const [confirmRestart, setConfirmRestart] = useState(false);

  const questionCount = getQuestionsForTest(testId).length;

  const begin = () => {
    const questionIds = shuffle(
      getQuestionsForTest(testId).map((question) => question.id),
    );
    if (questionIds.length === 0) return;

    start({
      sourceKey,
      testId,
      questionIds,
      mode: "study",
      timeLimitMs: null,
      now: Date.now(),
    });
    router.push(takeHref);
  };

  if (questionCount === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface-raised p-5">
        <h2 className="font-medium">No questions yet</h2>
        <p className="mt-2 text-sm text-muted">
          This certification has no practice exams, so there is nothing to
          practise. Add one and every question will show up here.
        </p>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="h-40 animate-pulse rounded-lg bg-surface" aria-busy="true" />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {session?.status === "in-progress" && (
        <div className="rounded-lg border border-border bg-surface-raised p-5">
          <h2 className="font-medium">Practice in progress</h2>
          <p className="mt-2 text-sm text-muted">
            {countAnswered(session)} of {session.questionIds.length} answered.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href={takeHref} variant="primary">
              Resume
            </ButtonLink>
            <Button variant="danger" onClick={() => setConfirmRestart(true)}>
              Start over
            </Button>
          </div>
        </div>
      )}

      {session?.status === "submitted" && (
        <div className="rounded-lg border border-border bg-surface-raised p-5">
          <h2 className="font-medium">Last run finished</h2>
          <p className="mt-2 text-sm text-muted">
            Anything you missed is waiting in your review list.
          </p>
          <ButtonLink href={resultsHref} className="mt-4">
            Review answers
          </ButtonLink>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface-raised p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-medium">
            {session === undefined ? "Practice" : "Start a new run"}
          </h2>
          <Badge>{pluralize(questionCount, "question")}</Badge>
        </div>

        <p className="mt-2 text-sm text-muted">
          Every question from every practice exam in this certification, in a
          random order. You get the answer and its explanation as soon as you
          respond, and answers lock once given.
        </p>

        <p className="mt-4 text-xs text-muted">
          Untimed, and not saved — reloading the page starts a new run, freshly
          shuffled. Questions you miss are still added to your review list.
        </p>

        <div className="mt-5">
          <Button variant="primary" onClick={begin}>
            {session === undefined ? "Start practice" : "Start a new run"}
          </Button>
        </div>
      </div>

      <Dialog
        open={confirmRestart}
        onClose={() => setConfirmRestart(false)}
        title="Start over?"
        description="Your answers in the current run will be discarded and the questions reshuffled. Your review list is not affected."
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
              Start over
            </Button>
          </>
        }
      />
    </div>
  );
}
