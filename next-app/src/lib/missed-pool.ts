/**
 * The missed-question pool. Pure reducer over plain data — no React, no storage.
 *
 * A question enters the pool when answered incorrectly and leaves after
 * GRADUATION_STREAK consecutive correct answers. Correct answers from *any*
 * session count toward the streak, not just review sessions: a question the user
 * has genuinely learned should not linger because they only met it in a full
 * practice exam.
 *
 * The pool is scoped per test, so it spans every practice exam in a
 * certification.
 */

export const GRADUATION_STREAK = 2;

export type MissedEntry = {
  questionId: string;
  testId: string;
  firstMissedAt: number;
  lastSeenAt: number;
  timesMissed: number;
  /** Consecutive correct answers. Reaching GRADUATION_STREAK removes the entry. */
  correctStreak: number;
};

/** Keyed by question id, which is globally unique across practice exams. */
export type MissedPool = Readonly<Record<string, MissedEntry>>;

export type GradedQuestion = {
  questionId: string;
  correct: boolean;
};

export const emptyPool: MissedPool = {};

/**
 * Folds a batch of graded questions into the pool, returning a new pool.
 *
 * Called on submit in exam mode, and per answer in study mode.
 */
export function applyResults(
  pool: MissedPool,
  {
    testId,
    graded,
    now,
  }: {
    testId: string;
    graded: readonly GradedQuestion[];
    now: number;
  },
): MissedPool {
  const next: Record<string, MissedEntry> = { ...pool };

  for (const { questionId, correct } of graded) {
    const existing = next[questionId];

    if (!correct) {
      next[questionId] = {
        questionId,
        testId,
        firstMissedAt: existing?.firstMissedAt ?? now,
        lastSeenAt: now,
        timesMissed: (existing?.timesMissed ?? 0) + 1,
        correctStreak: 0,
      };
      continue;
    }

    // A correct answer only matters for questions already in the pool.
    if (existing === undefined) continue;

    const correctStreak = existing.correctStreak + 1;

    if (correctStreak >= GRADUATION_STREAK) {
      delete next[questionId];
      continue;
    }

    next[questionId] = { ...existing, correctStreak, lastSeenAt: now };
  }

  return next;
}

export function entriesForTest(
  pool: MissedPool,
  testId: string,
): readonly MissedEntry[] {
  return Object.values(pool).filter((entry) => entry.testId === testId);
}

export function countForTest(pool: MissedPool, testId: string): number {
  return entriesForTest(pool, testId).length;
}

/**
 * Orders the pool for a review session: least-progressed first, then most
 * frequently missed, then least recently seen. Ties break on question id so the
 * result is deterministic.
 *
 * The caller snapshots the returned ids into the session, because the pool
 * mutates as answers are graded and a live-derived list would reshuffle the
 * exam mid-attempt.
 */
export function selectReviewQuestionIds(
  pool: MissedPool,
  { testId, limit }: { testId: string; limit?: number },
): string[] {
  const ordered = [...entriesForTest(pool, testId)].sort(
    (a, b) =>
      a.correctStreak - b.correctStreak ||
      b.timesMissed - a.timesMissed ||
      a.lastSeenAt - b.lastSeenAt ||
      a.questionId.localeCompare(b.questionId),
  );

  const ids = ordered.map((entry) => entry.questionId);

  return limit === undefined ? ids : ids.slice(0, limit);
}

/** Drops every entry for one test, leaving other tests untouched. */
export function clearTest(pool: MissedPool, testId: string): MissedPool {
  const next: Record<string, MissedEntry> = {};

  for (const [questionId, entry] of Object.entries(pool)) {
    if (entry.testId !== testId) next[questionId] = entry;
  }

  return next;
}
