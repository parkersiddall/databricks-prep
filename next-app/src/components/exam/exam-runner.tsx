"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { QuestionCard } from "@/components/exam/question-card";
import { QuestionNavGrid } from "@/components/exam/question-nav-grid";
import { RunnerHeader } from "@/components/exam/runner-header";
import { SubmitDialog } from "@/components/exam/submit-dialog";
import { Button, ButtonLink } from "@/components/ui/button";
import { useSessionRunner } from "@/hooks/use-session-runner";
import { formatPercent } from "@/lib/format";

export function ExamRunner({
  sourceKey,
  title,
  startHref,
  resultsHref,
}: {
  sourceKey: string;
  title: string;
  /** Start / resume screen, for when no session exists. */
  startHref: string;
  resultsHref: string;
}) {
  const router = useRouter();
  const state = useSessionRunner(sourceKey);
  const [confirming, setConfirming] = useState(false);

  if (state.status === "loading") {
    return (
      <div className="animate-pulse space-y-4" aria-busy="true">
        <div className="h-6 w-1/2 rounded bg-surface" />
        <div className="h-1.5 w-full rounded bg-surface" />
        <div className="h-64 w-full rounded-lg bg-surface" />
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="rounded-lg border border-border bg-surface-raised p-6">
        <h1 className="text-lg font-semibold">No exam in progress</h1>
        <p className="mt-2 text-sm text-muted">
          This sitting has not been started, or its saved progress was cleared.
        </p>
        <ButtonLink href={startHref} variant="primary" className="mt-4">
          Go to the start screen
        </ButtonLink>
      </div>
    );
  }

  const { runner } = state;
  const {
    session,
    questions,
    currentQuestion,
    currentIndex,
    answeredCount,
    unansweredIds,
    remainingMs,
    isStudyMode,
    isSubmitted,
  } = runner;

  if (isSubmitted) {
    const result = session.result;

    return (
      <div className="rounded-lg border border-border bg-surface-raised p-6">
        <h1 className="text-lg font-semibold">Exam submitted</h1>
        {result !== undefined && (
          <p className="mt-2 text-sm text-muted">
            You scored {result.correctCount} of {result.total} (
            {formatPercent(result.scorePct)}) —{" "}
            {result.passed ? "a pass" : "below the passing score"}.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href={resultsHref} variant="primary">
            Review answers
          </ButtonLink>
          <ButtonLink href={startHref}>Back to exam</ButtonLink>
        </div>
      </div>
    );
  }

  const isLast = currentIndex === questions.length - 1;

  return (
    <div>
      <RunnerHeader
        title={title}
        answeredCount={answeredCount}
        total={questions.length}
        remainingMs={remainingMs}
        studyMode={isStudyMode}
      />

      {/*
        Below `lg` the grid collapses into a disclosure above the question, so it
        stays reachable without pushing the exam itself down the page. `hidden`
        removes the other copy from the accessibility tree, so only one set of
        question buttons is ever exposed.
      */}
      <details className="mb-4 rounded-lg border border-border bg-surface-raised p-4 lg:hidden">
        <summary className="cursor-pointer text-sm font-medium">
          All questions ({answeredCount}/{questions.length} answered)
        </summary>
        <div className="mt-3">
          <QuestionNavGrid
            questionIds={session.questionIds}
            currentIndex={currentIndex}
            isAnswered={runner.isAnswered}
            isFlagged={runner.isFlagged}
            onSelect={runner.goTo}
          />
          {/* The sidebar's submit button is hidden at this width. */}
          <Button
            variant="secondary"
            size="sm"
            className="mt-4 w-full"
            onClick={() => setConfirming(true)}
          >
            Submit exam
          </Button>
        </div>
      </details>

      <div className="grid gap-6 lg:grid-cols-[1fr_12rem]">
        <div className="min-w-0">
          {currentQuestion === undefined ? (
            <p className="text-muted">This question is no longer available.</p>
          ) : (
            <QuestionCard
              question={currentQuestion}
              index={currentIndex}
              total={questions.length}
              answer={session.answers[currentQuestion.id]}
              flagged={runner.isFlagged(currentQuestion.id)}
              studyMode={isStudyMode}
              disabled={false}
              onAnswer={(value) => runner.answer(currentQuestion.id, value)}
              onToggleFlag={() => runner.toggleFlag(currentQuestion.id)}
            />
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button onClick={runner.previous} disabled={currentIndex === 0}>
              Previous
            </Button>

            {isLast ? (
              <Button variant="primary" onClick={() => setConfirming(true)}>
                Submit exam
              </Button>
            ) : (
              <Button variant="primary" onClick={runner.next}>
                Next
              </Button>
            )}
          </div>
        </div>

        <aside className="hidden lg:sticky lg:top-6 lg:block lg:self-start">
          <QuestionNavGrid
            questionIds={session.questionIds}
            currentIndex={currentIndex}
            isAnswered={runner.isAnswered}
            isFlagged={runner.isFlagged}
            onSelect={runner.goTo}
          />

          <Button
            variant="secondary"
            size="sm"
            className="mt-4 w-full"
            onClick={() => setConfirming(true)}
          >
            Submit exam
          </Button>
        </aside>
      </div>

      <SubmitDialog
        open={confirming}
        unansweredCount={unansweredIds.length}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          runner.submit();
          router.push(resultsHref);
        }}
      />
    </div>
  );
}
