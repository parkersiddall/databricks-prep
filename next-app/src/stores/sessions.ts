import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AttemptResult, AnswerValue } from "@/lib/grading";
import {
  createSession,
  flushTimer,
  goToIndex,
  pauseTimer,
  resumeTimer,
  setAnswer,
  submitSession,
  toggleFlag,
  type Session,
  type SessionMode,
} from "@/lib/session";

/**
 * In-progress and completed sittings, keyed by source key
 * (`pe:<practiceExamId>` or `review:<testId>`).
 *
 * Keying this way gives every practice exam its own independent slot, so one can
 * sit half-finished while another is untouched. All the real logic lives in
 * lib/session.ts; this store only holds the map and persists it.
 */

type SessionsState = {
  sessions: Record<string, Session>;
};

type SessionsActions = {
  start: (input: {
    sourceKey: string;
    testId: string;
    questionIds: readonly string[];
    mode: SessionMode;
    timeLimitMs: number | null;
    now: number;
  }) => void;
  answer: (
    sourceKey: string,
    questionId: string,
    answer: AnswerValue,
  ) => void;
  toggleFlag: (sourceKey: string, questionId: string) => void;
  goToIndex: (sourceKey: string, index: number) => void;
  resumeTimer: (sourceKey: string, now: number) => void;
  flushTimer: (sourceKey: string, now: number) => void;
  pauseTimer: (sourceKey: string, now: number) => void;
  submit: (sourceKey: string, result: AttemptResult, now: number) => void;
  discard: (sourceKey: string) => void;
  resetAll: () => void;
};

export const SESSIONS_STORAGE_KEY = "dbp:sessions:v1";

export const useSessionsStore = create<SessionsState & SessionsActions>()(
  persist(
    (set) => {
      /**
       * Applies a pure session operation. Bails out when the session is missing
       * or the operation returned the same object, so subscribers do not
       * re-render for no reason.
       */
      const update = (
        sourceKey: string,
        operation: (session: Session) => Session,
      ) =>
        set((state) => {
          const existing = state.sessions[sourceKey];
          if (existing === undefined) return state;

          const next = operation(existing);
          if (next === existing) return state;

          return { sessions: { ...state.sessions, [sourceKey]: next } };
        });

      return {
        sessions: {},

        // Always replaces whatever occupied the slot: this backs both "Start"
        // and "Restart". Resuming reads the existing session instead.
        start: (input) =>
          set((state) => ({
            sessions: {
              ...state.sessions,
              [input.sourceKey]: createSession(input),
            },
          })),

        answer: (sourceKey, questionId, answer) =>
          update(sourceKey, (session) =>
            setAnswer(session, questionId, answer),
          ),

        toggleFlag: (sourceKey, questionId) =>
          update(sourceKey, (session) => toggleFlag(session, questionId)),

        goToIndex: (sourceKey, index) =>
          update(sourceKey, (session) => goToIndex(session, index)),

        resumeTimer: (sourceKey, now) =>
          update(sourceKey, (session) => resumeTimer(session, now)),

        flushTimer: (sourceKey, now) =>
          update(sourceKey, (session) => flushTimer(session, now)),

        pauseTimer: (sourceKey, now) =>
          update(sourceKey, (session) => pauseTimer(session, now)),

        submit: (sourceKey, result, now) =>
          update(sourceKey, (session) => submitSession(session, result, now)),

        discard: (sourceKey) =>
          set((state) => {
            if (state.sessions[sourceKey] === undefined) return state;

            const sessions = { ...state.sessions };
            delete sessions[sourceKey];
            return { sessions };
          }),

        resetAll: () => set({ sessions: {} }),
      };
    },
    {
      name: SESSIONS_STORAGE_KEY,
      version: 1,
      // Persist state only; actions are recreated on every load.
      partialize: (state) => ({ sessions: state.sessions }),
    },
  ),
);

/** Stable selector, so components subscribe to one slot rather than the map. */
export const selectSession =
  (sourceKey: string) =>
  (state: SessionsState): Session | undefined =>
    state.sessions[sourceKey];
