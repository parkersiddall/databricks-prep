import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The stores are thin wrappers over the pure logic in lib/, so these tests only
 * cover what the wrapper adds: that state lands in localStorage under the right
 * key, and comes back after a reload.
 *
 * A reload is simulated by resetting the module registry so the store module is
 * evaluated again against the same storage.
 */

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const storage = new MemoryStorage();

vi.stubGlobal("localStorage", storage);
// Zustand's persist middleware checks for a browser-like environment.
vi.stubGlobal("window", { localStorage: storage });

beforeEach(() => {
  storage.clear();
  vi.resetModules();
});

const answer = { type: "single" as const, optionId: "a" };

describe("sessions store", () => {
  it("writes a started session to its own storage key", async () => {
    const { useSessionsStore, SESSIONS_STORAGE_KEY } = await import(
      "@/stores/sessions"
    );

    useSessionsStore.getState().start({
      sourceKey: "pe:pe-01",
      testId: "dea",
      questionIds: ["q1", "q2"],
      mode: "exam",
      timeLimitMs: 60_000,
      now: 1_000,
    });

    const raw = storage.getItem(SESSIONS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).state.sessions["pe:pe-01"].testId).toBe("dea");
  });

  it("restores answers and progress after a reload", async () => {
    const first = await import("@/stores/sessions");

    first.useSessionsStore.getState().start({
      sourceKey: "pe:pe-01",
      testId: "dea",
      questionIds: ["q1", "q2"],
      mode: "exam",
      timeLimitMs: 60_000,
      now: 1_000,
    });
    first.useSessionsStore.getState().answer("pe:pe-01", "q1", answer);
    first.useSessionsStore.getState().toggleFlag("pe:pe-01", "q2");
    first.useSessionsStore.getState().goToIndex("pe:pe-01", 1);

    vi.resetModules();
    const second = await import("@/stores/sessions");
    const restored = second.useSessionsStore.getState().sessions["pe:pe-01"];

    expect(restored.answers.q1).toEqual(answer);
    expect(restored.flagged).toEqual(["q2"]);
    expect(restored.currentIndex).toBe(1);
  });

  it("keeps each practice exam in an independent slot", async () => {
    const { useSessionsStore } = await import("@/stores/sessions");
    const start = (sourceKey: string) =>
      useSessionsStore.getState().start({
        sourceKey,
        testId: "dea",
        questionIds: ["q1"],
        mode: "exam",
        timeLimitMs: null,
        now: 0,
      });

    start("pe:pe-01");
    start("pe:pe-02");
    useSessionsStore.getState().answer("pe:pe-01", "q1", answer);

    const { sessions } = useSessionsStore.getState();
    expect(sessions["pe:pe-01"].answers.q1).toEqual(answer);
    expect(sessions["pe:pe-02"].answers).toEqual({});
  });

  it("discards one session without touching the others", async () => {
    const { useSessionsStore } = await import("@/stores/sessions");
    const start = (sourceKey: string) =>
      useSessionsStore.getState().start({
        sourceKey,
        testId: "dea",
        questionIds: ["q1"],
        mode: "exam",
        timeLimitMs: null,
        now: 0,
      });

    start("pe:pe-01");
    start("pe:pe-02");
    useSessionsStore.getState().discard("pe:pe-01");

    const { sessions } = useSessionsStore.getState();
    expect(sessions["pe:pe-01"]).toBeUndefined();
    expect(sessions["pe:pe-02"]).toBeDefined();
  });

  it("ignores actions for a source key with no session", async () => {
    const { useSessionsStore } = await import("@/stores/sessions");

    expect(() =>
      useSessionsStore.getState().answer("pe:missing", "q1", answer),
    ).not.toThrow();
    expect(useSessionsStore.getState().sessions).toEqual({});
  });
});

describe("missed store", () => {
  it("persists the pool and survives a reload", async () => {
    const first = await import("@/stores/missed");

    first.useMissedStore
      .getState()
      .applyGraded("dea", [{ questionId: "q1", correct: false }], 1_000);

    expect(storage.getItem(first.MISSED_STORAGE_KEY)).not.toBeNull();

    vi.resetModules();
    const second = await import("@/stores/missed");

    expect(second.useMissedStore.getState().pool.q1).toMatchObject({
      testId: "dea",
      timesMissed: 1,
      correctStreak: 0,
    });
  });

  it("uses a different storage key from sessions", async () => {
    const sessions = await import("@/stores/sessions");
    const missed = await import("@/stores/missed");

    expect(missed.MISSED_STORAGE_KEY).not.toBe(sessions.SESSIONS_STORAGE_KEY);
  });
});

describe("prefs store", () => {
  it("defaults to timed exam mode following the system theme", async () => {
    const { usePrefsStore } = await import("@/stores/prefs");

    expect(usePrefsStore.getState()).toMatchObject({
      defaultMode: "exam",
      timerEnabled: true,
      theme: "system",
    });
  });

  it("persists a changed preference across a reload", async () => {
    const first = await import("@/stores/prefs");
    first.usePrefsStore.getState().setTheme("dark");
    first.usePrefsStore.getState().setDefaultMode("study");

    vi.resetModules();
    const second = await import("@/stores/prefs");

    expect(second.usePrefsStore.getState().theme).toBe("dark");
    expect(second.usePrefsStore.getState().defaultMode).toBe("study");
  });
});
