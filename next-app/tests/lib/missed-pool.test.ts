import { describe, expect, it } from "vitest";

import {
  applyResults,
  clearTest,
  countForTest,
  emptyPool,
  entriesForTest,
  GRADUATION_STREAK,
  selectReviewQuestionIds,
  type MissedPool,
} from "@/lib/missed-pool";

const TEST_ID = "dea";

function miss(pool: MissedPool, questionId: string, now: number): MissedPool {
  return applyResults(pool, {
    testId: TEST_ID,
    graded: [{ questionId, correct: false }],
    now,
  });
}

function hit(pool: MissedPool, questionId: string, now: number): MissedPool {
  return applyResults(pool, {
    testId: TEST_ID,
    graded: [{ questionId, correct: true }],
    now,
  });
}

describe("applyResults", () => {
  it("adds a missed question to the pool", () => {
    const pool = miss(emptyPool, "q1", 1_000);

    expect(pool.q1).toEqual({
      questionId: "q1",
      testId: TEST_ID,
      firstMissedAt: 1_000,
      lastSeenAt: 1_000,
      timesMissed: 1,
      correctStreak: 0,
    });
  });

  it("does not mutate the pool it is given", () => {
    const before = miss(emptyPool, "q1", 1_000);
    const after = miss(before, "q1", 2_000);

    expect(before.q1.timesMissed).toBe(1);
    expect(after.q1.timesMissed).toBe(2);
    expect(after).not.toBe(before);
  });

  it("keeps firstMissedAt but advances lastSeenAt on a repeat miss", () => {
    const pool = miss(miss(emptyPool, "q1", 1_000), "q1", 5_000);

    expect(pool.q1).toMatchObject({
      firstMissedAt: 1_000,
      lastSeenAt: 5_000,
      timesMissed: 2,
    });
  });

  it("ignores a correct answer for a question not in the pool", () => {
    expect(hit(emptyPool, "q1", 1_000)).toEqual({});
  });

  it("requires two consecutive correct answers to graduate", () => {
    let pool = miss(emptyPool, "q1", 1_000);

    pool = hit(pool, "q1", 2_000);
    expect(pool.q1).toMatchObject({ correctStreak: 1, lastSeenAt: 2_000 });

    pool = hit(pool, "q1", 3_000);
    expect(pool.q1).toBeUndefined();
    expect(GRADUATION_STREAK).toBe(2);
  });

  it("resets the streak on a later miss", () => {
    let pool = miss(emptyPool, "q1", 1_000);
    pool = hit(pool, "q1", 2_000);
    expect(pool.q1.correctStreak).toBe(1);

    pool = miss(pool, "q1", 3_000);
    expect(pool.q1).toMatchObject({ correctStreak: 0, timesMissed: 2 });

    // One correct answer must no longer be enough to graduate.
    pool = hit(pool, "q1", 4_000);
    expect(pool.q1).toMatchObject({ correctStreak: 1 });
  });

  it("applies a whole batch at once", () => {
    const pool = applyResults(emptyPool, {
      testId: TEST_ID,
      graded: [
        { questionId: "q1", correct: false },
        { questionId: "q2", correct: false },
        { questionId: "q3", correct: true },
      ],
      now: 1_000,
    });

    expect(Object.keys(pool).sort()).toEqual(["q1", "q2"]);
  });

  it("keeps pools for different tests separate", () => {
    const pool = applyResults(miss(emptyPool, "q1", 1_000), {
      testId: "other",
      graded: [{ questionId: "q9", correct: false }],
      now: 1_000,
    });

    expect(countForTest(pool, TEST_ID)).toBe(1);
    expect(countForTest(pool, "other")).toBe(1);
    expect(entriesForTest(pool, TEST_ID).map((e) => e.questionId)).toEqual([
      "q1",
    ]);
  });
});

describe("selectReviewQuestionIds", () => {
  it("puts least-progressed questions first, then most missed", () => {
    let pool = emptyPool;
    // q1: missed twice, no progress. q2: missed once, one correct. q3: missed 3x.
    pool = miss(miss(pool, "q1", 1_000), "q1", 1_100);
    pool = hit(miss(pool, "q2", 1_200), "q2", 1_300);
    pool = miss(miss(miss(pool, "q3", 1_400), "q3", 1_500), "q3", 1_600);

    expect(selectReviewQuestionIds(pool, { testId: TEST_ID })).toEqual([
      "q3", // streak 0, missed 3
      "q1", // streak 0, missed 2
      "q2", // streak 1
    ]);
  });

  it("breaks ties on lastSeenAt, oldest first", () => {
    let pool = miss(emptyPool, "newer", 5_000);
    pool = miss(pool, "older", 1_000);

    expect(selectReviewQuestionIds(pool, { testId: TEST_ID })).toEqual([
      "older",
      "newer",
    ]);
  });

  it("respects a limit", () => {
    let pool = emptyPool;
    for (const id of ["q1", "q2", "q3"]) pool = miss(pool, id, 1_000);

    expect(selectReviewQuestionIds(pool, { testId: TEST_ID, limit: 2 })).toHaveLength(
      2,
    );
  });

  it("only returns questions for the requested test", () => {
    let pool = miss(emptyPool, "mine", 1_000);
    pool = applyResults(pool, {
      testId: "other",
      graded: [{ questionId: "theirs", correct: false }],
      now: 1_000,
    });

    expect(selectReviewQuestionIds(pool, { testId: TEST_ID })).toEqual(["mine"]);
  });

  it("returns an empty list for an empty pool", () => {
    expect(selectReviewQuestionIds(emptyPool, { testId: TEST_ID })).toEqual([]);
  });
});

describe("clearTest", () => {
  it("drops one test's entries and leaves others alone", () => {
    let pool = miss(emptyPool, "mine", 1_000);
    pool = applyResults(pool, {
      testId: "other",
      graded: [{ questionId: "theirs", correct: false }],
      now: 1_000,
    });

    const cleared = clearTest(pool, TEST_ID);

    expect(cleared.mine).toBeUndefined();
    expect(cleared.theirs).toBeDefined();
  });
});
