import { describe, expect, it } from "vitest";

import {
  createTimer,
  elapsedAt,
  flush,
  isExpired,
  isRunning,
  minutesToMs,
  pause,
  remainingMs,
  resume,
} from "@/lib/timer";

const LIMIT = minutesToMs(90);

describe("createTimer", () => {
  it("starts paused with nothing elapsed", () => {
    const timer = createTimer(LIMIT);

    expect(isRunning(timer)).toBe(false);
    expect(elapsedAt(timer, 1_000)).toBe(0);
    expect(remainingMs(timer, 1_000)).toBe(LIMIT);
  });
});

describe("resume", () => {
  it("starts the clock", () => {
    const timer = resume(createTimer(LIMIT), 1_000);

    expect(isRunning(timer)).toBe(true);
    expect(elapsedAt(timer, 4_000)).toBe(3_000);
  });

  it("is idempotent, so repeated mounts do not lose banked time", () => {
    const running = resume(createTimer(LIMIT), 1_000);
    const again = resume(running, 9_000);

    expect(again).toBe(running);
    expect(elapsedAt(again, 4_000)).toBe(3_000);
  });
});

describe("flush", () => {
  it("banks elapsed time and keeps running", () => {
    const timer = flush(resume(createTimer(LIMIT), 1_000), 4_000);

    expect(timer.elapsedMs).toBe(3_000);
    expect(isRunning(timer)).toBe(true);
    expect(elapsedAt(timer, 5_000)).toBe(4_000);
  });

  it("does nothing while paused", () => {
    const paused = createTimer(LIMIT);
    expect(flush(paused, 5_000)).toBe(paused);
  });
});

describe("pause", () => {
  it("banks elapsed time and stops the clock", () => {
    const timer = pause(resume(createTimer(LIMIT), 1_000), 4_000);

    expect(timer.elapsedMs).toBe(3_000);
    expect(isRunning(timer)).toBe(false);
  });

  // This is the behaviour that makes "finish it later" work.
  it("stops accruing time while paused, however long the gap", () => {
    const timer = pause(resume(createTimer(LIMIT), 1_000), 4_000);

    expect(elapsedAt(timer, 4_000 + minutesToMs(60))).toBe(3_000);
    expect(remainingMs(timer, 4_000 + minutesToMs(60))).toBe(LIMIT - 3_000);
  });

  it("resumes from where it left off across a close-and-reopen", () => {
    let timer = resume(createTimer(LIMIT), 0);
    timer = pause(timer, minutesToMs(10));

    // Tab closed for an hour, then reopened.
    const reopenedAt = minutesToMs(70);
    timer = resume(timer, reopenedAt);

    expect(elapsedAt(timer, reopenedAt + minutesToMs(5))).toBe(minutesToMs(15));
  });
});

describe("remainingMs", () => {
  it("counts down and never goes negative", () => {
    const timer = resume(createTimer(minutesToMs(1)), 0);

    expect(remainingMs(timer, 30_000)).toBe(30_000);
    expect(remainingMs(timer, 90_000)).toBe(0);
  });

  it("is null for an untimed exam", () => {
    expect(remainingMs(resume(createTimer(null), 0), 999_999)).toBeNull();
  });
});

describe("isExpired", () => {
  it("is false before the limit and true at or past it", () => {
    const timer = resume(createTimer(minutesToMs(1)), 0);

    expect(isExpired(timer, 59_999)).toBe(false);
    expect(isExpired(timer, 60_000)).toBe(true);
    expect(isExpired(timer, 120_000)).toBe(true);
  });

  it("is never true for an untimed exam", () => {
    expect(isExpired(resume(createTimer(null), 0), 999_999)).toBe(false);
  });
});

describe("clock robustness", () => {
  // A backwards system clock must not refund time already spent.
  it("clamps a backwards clock to zero rather than negative elapsed", () => {
    const timer = resume(createTimer(LIMIT), 10_000);

    expect(elapsedAt(timer, 5_000)).toBe(0);
    expect(remainingMs(timer, 5_000)).toBe(LIMIT);
  });

  it("does not lose banked time when the clock jumps backwards", () => {
    let timer = resume(createTimer(LIMIT), 0);
    timer = pause(timer, 10_000);
    timer = resume(timer, 100_000);

    expect(elapsedAt(timer, 50_000)).toBe(10_000);
  });
});
