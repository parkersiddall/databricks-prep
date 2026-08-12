import { describe, expect, it } from "vitest";

import type { AttemptResult } from "@/lib/grading";
import {
  answeredCount,
  createSession,
  flushTimer,
  goToIndex,
  isFlagged,
  pauseTimer,
  practiceExamSourceKey,
  resumeTimer,
  reviewSourceKey,
  setAnswer,
  submitSession,
  toggleFlag,
  unansweredQuestionIds,
  type Session,
} from "@/lib/session";
import { elapsedAt, minutesToMs } from "@/lib/timer";

const QUESTION_IDS = ["q1", "q2", "q3"];

function newSession(mode: "exam" | "study" = "exam"): Session {
  return createSession({
    sourceKey: practiceExamSourceKey("pe-01"),
    testId: "dea",
    questionIds: QUESTION_IDS,
    mode,
    timeLimitMs: minutesToMs(90),
    now: 1_000,
    id: "fixed-id",
  });
}

const answer = (optionId: string) => ({ type: "single" as const, optionId });

const emptyResult: AttemptResult = {
  correctCount: 0,
  answeredCount: 0,
  total: 3,
  scorePct: 0,
  passed: false,
  perQuestion: [],
  byDomain: [],
};

describe("source keys", () => {
  it("namespaces practice exams and reviews separately", () => {
    expect(practiceExamSourceKey("pe-01")).toBe("pe:pe-01");
    expect(reviewSourceKey("dea")).toBe("review:dea");
  });
});

describe("createSession", () => {
  it("starts empty, at the first question, with a paused timer", () => {
    const session = newSession();

    expect(session).toMatchObject({
      currentIndex: 0,
      answers: {},
      flagged: [],
      status: "in-progress",
      startedAt: 1_000,
    });
    expect(session.timer.lastResumedAt).toBeNull();
    expect(session.timer.elapsedMs).toBe(0);
  });

  // The snapshot is what stops a review session reshuffling mid-attempt.
  it("copies the question ids rather than aliasing the caller's array", () => {
    const source = [...QUESTION_IDS];
    const session = createSession({
      sourceKey: "pe:x",
      testId: "dea",
      questionIds: source,
      mode: "exam",
      timeLimitMs: null,
      now: 0,
      id: "x",
    });

    source.push("q4");
    expect(session.questionIds).toEqual(QUESTION_IDS);
  });
});

describe("setAnswer", () => {
  it("records an answer without mutating the original", () => {
    const before = newSession();
    const after = setAnswer(before, "q1", answer("a"));

    expect(before.answers).toEqual({});
    expect(after.answers.q1).toEqual({ type: "single", optionId: "a" });
  });

  it("allows changing an answer in exam mode", () => {
    let session = setAnswer(newSession("exam"), "q1", answer("a"));
    session = setAnswer(session, "q1", answer("b"));

    expect(session.answers.q1).toEqual({ type: "single", optionId: "b" });
  });

  // Study mode grades into the missed pool the moment an answer lands, so
  // letting it change afterwards would apply the question twice.
  it("locks an answered question in study mode", () => {
    let session = setAnswer(newSession("study"), "q1", answer("a"));
    session = setAnswer(session, "q1", answer("b"));

    expect(session.answers.q1).toEqual({ type: "single", optionId: "a" });
  });

  it("ignores questions outside the session", () => {
    const session = setAnswer(newSession(), "not-in-session", answer("a"));
    expect(session.answers).toEqual({});
  });

  it("ignores answers after submission", () => {
    const submitted = submitSession(newSession(), emptyResult, 5_000);
    expect(setAnswer(submitted, "q1", answer("a")).answers).toEqual({});
  });
});

describe("counting", () => {
  it("counts answered and unanswered questions", () => {
    let session = newSession();
    expect(answeredCount(session)).toBe(0);
    expect(unansweredQuestionIds(session)).toEqual(QUESTION_IDS);

    session = setAnswer(session, "q2", answer("a"));
    expect(answeredCount(session)).toBe(1);
    expect(unansweredQuestionIds(session)).toEqual(["q1", "q3"]);
  });
});

describe("toggleFlag", () => {
  it("flags and unflags", () => {
    let session = toggleFlag(newSession(), "q2");
    expect(isFlagged(session, "q2")).toBe(true);

    session = toggleFlag(session, "q2");
    expect(isFlagged(session, "q2")).toBe(false);
    expect(session.flagged).toEqual([]);
  });

  it("ignores unknown questions and submitted sessions", () => {
    expect(toggleFlag(newSession(), "nope").flagged).toEqual([]);

    const submitted = submitSession(newSession(), emptyResult, 5_000);
    expect(toggleFlag(submitted, "q1").flagged).toEqual([]);
  });
});

describe("goToIndex", () => {
  it("moves within range", () => {
    expect(goToIndex(newSession(), 2).currentIndex).toBe(2);
  });

  it("clamps out-of-range indices so callers can pass index ± 1 freely", () => {
    expect(goToIndex(newSession(), -5).currentIndex).toBe(0);
    expect(goToIndex(newSession(), 99).currentIndex).toBe(2);
  });

  it("returns the same object when the index does not change", () => {
    const session = newSession();
    expect(goToIndex(session, 0)).toBe(session);
  });
});

describe("submitSession", () => {
  it("marks submitted, stores the result, and stops the clock", () => {
    const running = resumeTimer(newSession(), 1_000);
    const submitted = submitSession(running, emptyResult, 4_000);

    expect(submitted.status).toBe("submitted");
    expect(submitted.result).toBe(emptyResult);
    expect(submitted.submittedAt).toBe(4_000);
    expect(submitted.timer.lastResumedAt).toBeNull();
    expect(submitted.timer.elapsedMs).toBe(3_000);
  });

  it("is idempotent", () => {
    const first = submitSession(newSession(), emptyResult, 4_000);
    expect(submitSession(first, emptyResult, 9_000)).toBe(first);
  });
});

describe("timer passthroughs", () => {
  it("resumes, flushes, and pauses through the session", () => {
    let session = resumeTimer(newSession(), 1_000);
    expect(elapsedAt(session.timer, 3_000)).toBe(2_000);

    session = flushTimer(session, 3_000);
    expect(session.timer.elapsedMs).toBe(2_000);

    session = pauseTimer(session, 5_000);
    expect(session.timer.lastResumedAt).toBeNull();
    expect(elapsedAt(session.timer, 999_999)).toBe(4_000);
  });

  it("does not restart the clock on a submitted session", () => {
    const submitted = submitSession(newSession(), emptyResult, 4_000);
    expect(resumeTimer(submitted, 9_000)).toBe(submitted);
  });

  it("returns the same object when the timer is unchanged", () => {
    const session = newSession();
    expect(flushTimer(session, 5_000)).toBe(session);
  });
});
