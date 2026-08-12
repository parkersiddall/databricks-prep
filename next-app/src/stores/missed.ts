import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  applyResults,
  clearTest,
  emptyPool,
  type GradedQuestion,
  type MissedPool,
} from "@/lib/missed-pool";

/**
 * The missed-question pool, scoped per test and shared across every practice
 * exam in that test.
 *
 * Reducer logic lives in lib/missed-pool.ts. Read helpers (`countForTest`,
 * `selectReviewQuestionIds`) are pure functions there — call them with `pool`
 * rather than adding selectors here.
 */

type MissedState = {
  pool: MissedPool;
};

type MissedActions = {
  /**
   * Folds graded questions into the pool. Called once on submit in exam mode,
   * and per answer in study mode — never both for the same question, or the
   * question would be counted twice.
   */
  applyGraded: (
    testId: string,
    graded: readonly GradedQuestion[],
    now: number,
  ) => void;
  clearForTest: (testId: string) => void;
  resetAll: () => void;
};

export const MISSED_STORAGE_KEY = "dbp:missed:v1";

export const useMissedStore = create<MissedState & MissedActions>()(
  persist(
    (set) => ({
      pool: emptyPool,

      applyGraded: (testId, graded, now) =>
        set((state) => ({
          pool: applyResults(state.pool, { testId, graded, now }),
        })),

      clearForTest: (testId) =>
        set((state) => ({ pool: clearTest(state.pool, testId) })),

      resetAll: () => set({ pool: emptyPool }),
    }),
    {
      name: MISSED_STORAGE_KEY,
      version: 1,
      partialize: (state) => ({ pool: state.pool }),
    },
  ),
);
