"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatMinutes, formatPercent, pluralize } from "@/lib/format";
import { answeredCount as countAnswered } from "@/lib/session";
import { minutesToMs } from "@/lib/timer";
import { selectSession, useSessionsStore } from "@/stores/sessions";
import { usePrefsStore } from "@/stores/prefs";

/**
 * Start, resume, or restart a sitting.
 *
 * Everything that depends on saved progress is gated behind `useHydrated`, since
 * the server has no way to know whether a session exists.
 */
export function StartPanel({
  sourceKey,
  testId,
  questionIds,
  timeLimitMinutes,
  takeHref,
  resultsHref,
}: {
  sourceKey: string;
  testId: string;
  questionIds: readonly string[];
  /** Null when the exam has no configured limit. */
  timeLimitMinutes: number | null;
  takeHref: string;
  resultsHref: string;
}) {
  const router = useRouter();
  const hydrated = useHydrated(useSessionsStore);
  const session = useSessionsStore(selectSession(sourceKey));
  const start = useSessionsStore((state) => state.start);

  const defaultMode = usePrefsStore((state) => state.defaultMode);
  const timerEnabledPref = usePrefsStore((state) => state.timerEnabled);

  const [mode, setMode] = useState(defaultMode);
  const [timed, setTimed] = useState(timerEnabledPref);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const begin = () => {
    start({
      sourceKey,
      testId,
      questionIds,
      mode,
      timeLimitMs:
        timed && timeLimitMinutes !== null ? minutesToMs(timeLimitMinutes) : null,
      now: Date.now(),
    });
    router.push(takeHref);
  };

  if (!hydrated) {
    return (
      <div className="h-40 animate-pulse rounded-lg bg-surface" aria-busy="true" />
    );
  }

  if (session?.status === "submitted") {
    const result = session.result;

    return (
      <div className="rounded-lg border border-border bg-surface-raised p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-medium">Completed</h2>
          {result !== undefined && (
            <Badge tone={result.passed ? "success" : "danger"}>
              {formatPercent(result.scorePct)}
            </Badge>
          )}
        </div>
        {result !== undefined && (
          <p className="mt-2 text-sm text-muted">
            {result.correctCount} of {result.total} correct.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href={resultsHref} variant="primary">
            Review answers
          </ButtonLink>
          <Button onClick={() => setConfirmRestart(true)}>Retake</Button>
        </div>

        <RestartDialog
          open={confirmRestart}
          retake
          onCancel={() => setConfirmRestart(false)}
          onConfirm={() => {
            setConfirmRestart(false);
            begin();
          }}
        />
      </div>
    );
  }

  if (session !== undefined) {
    const answered = countAnswered(session);

    return (
      <div className="rounded-lg border border-border bg-surface-raised p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-medium">In progress</h2>
          {session.mode === "study" && <Badge tone="primary">Study mode</Badge>}
        </div>
        <p className="mt-2 text-sm text-muted">
          {answered} of {session.questionIds.length} answered. Your progress is
          saved in this browser.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href={takeHref} variant="primary">
            Resume
          </ButtonLink>
          <Button variant="danger" onClick={() => setConfirmRestart(true)}>
            Start over
          </Button>
        </div>

        <RestartDialog
          open={confirmRestart}
          retake={false}
          onCancel={() => setConfirmRestart(false)}
          onConfirm={() => {
            setConfirmRestart(false);
            begin();
          }}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-5">
      <h2 className="font-medium">Before you start</h2>
      <p className="mt-2 text-sm text-muted">
        {pluralize(questionIds.length, "question")}
        {timeLimitMinutes !== null && timed
          ? ` · ${formatMinutes(timeLimitMinutes)}`
          : " · untimed"}
        . You can leave and come back — progress is saved in this browser.
      </p>

      <fieldset className="mt-5">
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted">
          Mode
        </legend>
        <div className="mt-2 flex flex-col gap-2">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="radio"
              name="mode"
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
          <label className="flex items-start gap-3 text-sm">
            <input
              type="radio"
              name="mode"
              checked={mode === "study"}
              onChange={() => setMode("study")}
              className="mt-0.5 accent-primary"
            />
            <span>
              <span className="font-medium">Study</span>
              <span className="block text-muted">
                Shows whether each answer was right straight away. Answers lock
                once given.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      {timeLimitMinutes !== null && (
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={timed}
            onChange={(event) => setTimed(event.target.checked)}
            className="accent-primary"
          />
          Use the {formatMinutes(timeLimitMinutes)} time limit
        </label>
      )}

      <Button variant="primary" className="mt-5" onClick={begin}>
        Start
      </Button>
    </div>
  );
}

function RestartDialog({
  open,
  retake,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  retake: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={retake ? "Retake this exam?" : "Start over?"}
      description={
        retake
          ? "Your previous score and answers for this exam will be replaced. Missed questions already recorded stay in your review pool."
          : "Your current answers for this exam will be discarded and the timer reset."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {retake ? "Retake" : "Start over"}
          </Button>
        </>
      }
    />
  );
}
