"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getQuestionById,
  getQuestionsByIds,
  getTestById,
} from "@/content/queries";
import type { Question } from "@/content/schema";
import {
  isAnswerCorrect,
  scoreAttempt,
  type AnswerValue,
  type AttemptResult,
} from "@/lib/grading";
import {
  answeredCount as countAnswered,
  isFlagged,
  unansweredQuestionIds,
  type Session,
} from "@/lib/session";
import { isExpired, remainingMs } from "@/lib/timer";
import { useHydrated } from "@/hooks/use-hydrated";
import { useMissedStore } from "@/stores/missed";
import { selectSession, useSessionsStore } from "@/stores/sessions";

/**
 * Binds a source key to the sessions store, the missed pool, and a ticking
 * clock. This is the runner UI's entire API.
 *
 * Returns `null` until the store has hydrated, so callers render a skeleton
 * rather than briefly showing an empty exam.
 */

export type SessionRunner = {
  session: Session;
  questions: readonly Question[];
  currentQuestion: Question | undefined;
  currentIndex: number;
  answeredCount: number;
  unansweredIds: readonly string[];
  /** Null when the exam is untimed. */
  remainingMs: number | null;
  isStudyMode: boolean;
  isSubmitted: boolean;
  isAnswered: (questionId: string) => boolean;
  isFlagged: (questionId: string) => boolean;
  goTo: (index: number) => void;
  next: () => void;
  previous: () => void;
  answer: (questionId: string, value: AnswerValue) => void;
  toggleFlag: (questionId: string) => void;
  submit: () => void;
};

const TICK_MS = 1_000;

export function useSessionRunner(sourceKey: string): SessionRunner | null {
  const hydrated = useHydrated(useSessionsStore);
  const session = useSessionsStore(selectSession(sourceKey));

  // Selected individually: returning a fresh object from one selector would
  // change identity on every render.
  const answerAction = useSessionsStore((state) => state.answer);
  const toggleFlagAction = useSessionsStore((state) => state.toggleFlag);
  const goToIndexAction = useSessionsStore((state) => state.goToIndex);
  const resumeTimerAction = useSessionsStore((state) => state.resumeTimer);
  const flushTimerAction = useSessionsStore((state) => state.flushTimer);
  const pauseTimerAction = useSessionsStore((state) => state.pauseTimer);
  const submitAction = useSessionsStore((state) => state.submit);
  const applyGraded = useMissedStore((state) => state.applyGraded);

  const [now, setNow] = useState(() => Date.now());

  const status = session?.status;
  const isRunning = status === "in-progress";

  /**
   * Reads the live session from the store rather than closing over `session`,
   * so callbacks stay stable and never act on a stale snapshot.
   */
  const currentSession = useCallback(
    () => useSessionsStore.getState().sessions[sourceKey],
    [sourceKey],
  );

  const submit = useCallback(() => {
    const live = currentSession();
    if (live === undefined || live.status === "submitted") return;

    const questions = getQuestionsByIds(live.questionIds);
    const test = getTestById(live.testId);
    const submittedAt = Date.now();

    const result: AttemptResult = scoreAttempt(questions, live.answers, {
      passingScorePct: test?.passingScorePct ?? 0,
    });

    submitAction(sourceKey, result, submittedAt);

    // Study mode already fed the pool as each answer landed; applying the batch
    // again here would double-count every question.
    if (live.mode === "exam") {
      applyGraded(
        live.testId,
        result.perQuestion.map((outcome) => ({
          questionId: outcome.questionId,
          correct: outcome.correct,
        })),
        submittedAt,
      );
    }
  }, [applyGraded, currentSession, sourceKey, submitAction]);

  // Start the clock on mount and bank it on unmount. `resumeTimer` is
  // idempotent, so a double-mount in development cannot lose banked time.
  useEffect(() => {
    if (!hydrated || !isRunning) return;

    resumeTimerAction(sourceKey, Date.now());

    return () => {
      pauseTimerAction(sourceKey, Date.now());
    };
  }, [hydrated, isRunning, pauseTimerAction, resumeTimerAction, sourceKey]);

  // Tick for the countdown display, flushing so a crash costs at most one tick.
  useEffect(() => {
    if (!hydrated || !isRunning) return;

    const interval = window.setInterval(() => {
      flushTimerAction(sourceKey, Date.now());
      setNow(Date.now());
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [flushTimerAction, hydrated, isRunning, sourceKey]);

  // Bank time when the tab is hidden or closed, so a session that is never
  // formally paused still records the right elapsed time.
  useEffect(() => {
    if (!hydrated || !isRunning) return;

    const bank = () => {
      if (document.visibilityState === "hidden") {
        pauseTimerAction(sourceKey, Date.now());
      } else {
        resumeTimerAction(sourceKey, Date.now());
      }
    };

    const bankOnUnload = () => pauseTimerAction(sourceKey, Date.now());

    document.addEventListener("visibilitychange", bank);
    window.addEventListener("beforeunload", bankOnUnload);

    return () => {
      document.removeEventListener("visibilitychange", bank);
      window.removeEventListener("beforeunload", bankOnUnload);
    };
  }, [hydrated, isRunning, pauseTimerAction, resumeTimerAction, sourceKey]);

  // Auto-submit the moment the limit is reached.
  useEffect(() => {
    if (!hydrated || session === undefined || session.status !== "in-progress") {
      return;
    }
    if (isExpired(session.timer, now)) submit();
  }, [hydrated, now, session, submit]);

  const questions = useMemo(
    () => (session === undefined ? [] : getQuestionsByIds(session.questionIds)),
    [session],
  );

  const answer = useCallback(
    (questionId: string, value: AnswerValue) => {
      const live = currentSession();
      if (live === undefined) return;

      const alreadyAnswered = live.answers[questionId] !== undefined;
      // Study mode locks an answered question; setAnswer enforces this too, but
      // returning early also avoids grading the same question into the pool twice.
      if (live.mode === "study" && alreadyAnswered) return;

      answerAction(sourceKey, questionId, value);

      if (live.mode === "study") {
        const question = getQuestionById(questionId);
        if (question !== undefined) {
          applyGraded(
            live.testId,
            [{ questionId, correct: isAnswerCorrect(question, value) }],
            Date.now(),
          );
        }
      }
    },
    [answerAction, applyGraded, currentSession, sourceKey],
  );

  if (!hydrated || session === undefined) return null;

  return {
    session,
    questions,
    currentQuestion: questions[session.currentIndex],
    currentIndex: session.currentIndex,
    answeredCount: countAnswered(session),
    unansweredIds: unansweredQuestionIds(session),
    remainingMs: remainingMs(session.timer, now),
    isStudyMode: session.mode === "study",
    isSubmitted: session.status === "submitted",
    isAnswered: (questionId) => session.answers[questionId] !== undefined,
    isFlagged: (questionId) => isFlagged(session, questionId),
    goTo: (index) => goToIndexAction(sourceKey, index),
    next: () => goToIndexAction(sourceKey, session.currentIndex + 1),
    previous: () => goToIndexAction(sourceKey, session.currentIndex - 1),
    answer,
    toggleFlag: (questionId) => toggleFlagAction(sourceKey, questionId),
    submit,
  };
}
