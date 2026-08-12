/**
 * Exam timer math. Pure functions over plain data — no React, no storage.
 *
 * The clock **accumulates on pause** rather than storing a fixed deadline:
 * `elapsedMs` holds time already banked, and `lastResumedAt` marks when the
 * current running stretch began. Closing the tab therefore pauses the timer,
 * which is what "finish it later" implies.
 *
 * Callers flush on an interval and on visibilitychange / beforeunload so a
 * crash loses at most one interval's worth of time.
 */

export type TimerState = {
  /** Null means untimed. */
  timeLimitMs: number | null;
  /** Time banked from previous running stretches. */
  elapsedMs: number;
  /** When the current stretch began, or null while paused. */
  lastResumedAt: number | null;
};

export function createTimer(timeLimitMs: number | null): TimerState {
  return { timeLimitMs, elapsedMs: 0, lastResumedAt: null };
}

export function isRunning(state: TimerState): boolean {
  return state.lastResumedAt !== null;
}

/**
 * Time elapsed in the current running stretch. Clamped at zero so a backwards
 * system clock cannot hand back time already spent.
 */
function currentStretchMs(state: TimerState, now: number): number {
  if (state.lastResumedAt === null) return 0;
  return Math.max(0, now - state.lastResumedAt);
}

export function elapsedAt(state: TimerState, now: number): number {
  return state.elapsedMs + currentStretchMs(state, now);
}

/** Starts the clock. A no-op if it is already running, so mounts are safe. */
export function resume(state: TimerState, now: number): TimerState {
  if (isRunning(state)) return state;
  return { ...state, lastResumedAt: now };
}

/** Banks elapsed time and keeps running. Use on an interval tick. */
export function flush(state: TimerState, now: number): TimerState {
  if (!isRunning(state)) return state;
  return { ...state, elapsedMs: elapsedAt(state, now), lastResumedAt: now };
}

/** Banks elapsed time and stops the clock. Use on unmount or tab close. */
export function pause(state: TimerState, now: number): TimerState {
  if (!isRunning(state)) return state;
  return { ...state, elapsedMs: elapsedAt(state, now), lastResumedAt: null };
}

/** Null when untimed. Never negative. */
export function remainingMs(state: TimerState, now: number): number | null {
  if (state.timeLimitMs === null) return null;
  return Math.max(0, state.timeLimitMs - elapsedAt(state, now));
}

/** Untimed exams never expire. */
export function isExpired(state: TimerState, now: number): boolean {
  const remaining = remainingMs(state, now);
  return remaining !== null && remaining <= 0;
}

export function minutesToMs(minutes: number): number {
  return minutes * 60_000;
}
