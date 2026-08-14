import type { AnswerValue, AttemptResult } from "@/lib/grading";
import {
  createTimer,
  flush,
  pause,
  resume,
  type TimerState,
} from "@/lib/timer";

/**
 * A sitting of a practice exam or a review drill, and the pure operations on it.
 *
 * Kept free of React and storage so it can be unit tested directly; the Zustand
 * store in stores/sessions.ts is a thin wrapper that calls these. Every
 * operation returns a new Session, or the same object when nothing changed, so
 * the store can skip needless re-renders.
 */

export type SessionMode = "exam" | "study";
export type SessionStatus = "in-progress" | "submitted";

export type Session = {
  id: string;
  /**
   * `pe:<practiceExamId>`, `review:<testId>` or `all:<testId>`. Identifies the
   * session slot.
   */
  sourceKey: string;
  testId: string;
  /**
   * Frozen at creation. Review sessions must not reshuffle when the missed pool
   * changes mid-attempt, and a resumed exam must present the same order.
   */
  questionIds: string[];
  answers: Record<string, AnswerValue>;
  flagged: string[];
  currentIndex: number;
  mode: SessionMode;
  startedAt: number;
  timer: TimerState;
  status: SessionStatus;
  result?: AttemptResult;
  submittedAt?: number;
};

export function practiceExamSourceKey(practiceExamId: string): string {
  return `pe:${practiceExamId}`;
}

export function reviewSourceKey(testId: string): string {
  return `review:${testId}`;
}

/**
 * Marks the "practice all questions" slot. Sessions under this prefix are
 * deliberately **not persisted** — see stores/sessions.ts — so the prefix is
 * exported for the store to filter on.
 */
export const ALL_QUESTIONS_PREFIX = "all:";

export function allQuestionsSourceKey(testId: string): string {
  return `${ALL_QUESTIONS_PREFIX}${testId}`;
}

/** True for the ephemeral all-questions slots, whatever test they belong to. */
export function isAllQuestionsSourceKey(sourceKey: string): boolean {
  return sourceKey.startsWith(ALL_QUESTIONS_PREFIX);
}

export function createSession({
  sourceKey,
  testId,
  questionIds,
  mode,
  timeLimitMs,
  now,
  id = crypto.randomUUID(),
}: {
  sourceKey: string;
  testId: string;
  questionIds: readonly string[];
  mode: SessionMode;
  timeLimitMs: number | null;
  now: number;
  id?: string;
}): Session {
  return {
    id,
    sourceKey,
    testId,
    questionIds: [...questionIds],
    answers: {},
    flagged: [],
    currentIndex: 0,
    mode,
    startedAt: now,
    timer: createTimer(timeLimitMs),
    status: "in-progress",
  };
}

export function isSubmitted(session: Session): boolean {
  return session.status === "submitted";
}

export function answeredCount(session: Session): number {
  return session.questionIds.filter(
    (questionId) => session.answers[questionId] !== undefined,
  ).length;
}

export function unansweredQuestionIds(session: Session): string[] {
  return session.questionIds.filter(
    (questionId) => session.answers[questionId] === undefined,
  );
}

export function isFlagged(session: Session, questionId: string): boolean {
  return session.flagged.includes(questionId);
}

/**
 * Records an answer.
 *
 * Ignored once the session is submitted, and — in study mode — once the question
 * has already been answered. Study mode reveals the correct answer immediately
 * and feeds the missed pool at that moment, so allowing a change afterwards
 * would let the user grade themselves twice.
 */
export function setAnswer(
  session: Session,
  questionId: string,
  answer: AnswerValue,
): Session {
  if (isSubmitted(session)) return session;
  if (!session.questionIds.includes(questionId)) return session;
  if (session.mode === "study" && session.answers[questionId] !== undefined) {
    return session;
  }

  return {
    ...session,
    answers: { ...session.answers, [questionId]: answer },
  };
}

export function toggleFlag(session: Session, questionId: string): Session {
  if (isSubmitted(session)) return session;
  if (!session.questionIds.includes(questionId)) return session;

  const flagged = isFlagged(session, questionId)
    ? session.flagged.filter((id) => id !== questionId)
    : [...session.flagged, questionId];

  return { ...session, flagged };
}

/** Clamps into range, so callers can pass `index + 1` without bounds checks. */
export function goToIndex(session: Session, index: number): Session {
  const lastIndex = session.questionIds.length - 1;
  const clamped = Math.min(Math.max(index, 0), Math.max(lastIndex, 0));

  return clamped === session.currentIndex
    ? session
    : { ...session, currentIndex: clamped };
}

export function submitSession(
  session: Session,
  result: AttemptResult,
  now: number,
): Session {
  if (isSubmitted(session)) return session;

  return {
    ...session,
    // Stop the clock, banking whatever the final stretch was worth.
    timer: pause(session.timer, now),
    status: "submitted",
    result,
    submittedAt: now,
  };
}

// --- timer passthroughs, so callers never reach into session.timer -----------

export function resumeTimer(session: Session, now: number): Session {
  if (isSubmitted(session)) return session;

  const timer = resume(session.timer, now);
  return timer === session.timer ? session : { ...session, timer };
}

export function flushTimer(session: Session, now: number): Session {
  const timer = flush(session.timer, now);
  return timer === session.timer ? session : { ...session, timer };
}

export function pauseTimer(session: Session, now: number): Session {
  const timer = pause(session.timer, now);
  return timer === session.timer ? session : { ...session, timer };
}
