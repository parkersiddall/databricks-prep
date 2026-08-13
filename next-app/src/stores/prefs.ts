import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { SessionMode } from "@/lib/session";

/**
 * User preferences. Separate storage key from sessions and the missed pool, so a
 * schema change to one never destroys the others.
 */

export type ThemePreference = "system" | "light" | "dark";

type PrefsState = {
  /** Pre-selected on the start screen; the user can still override per sitting. */
  defaultMode: SessionMode;
  /** When false, exams start untimed regardless of the test's limit. */
  timerEnabled: boolean;
  theme: ThemePreference;
};

type PrefsActions = {
  setDefaultMode: (mode: SessionMode) => void;
  setTimerEnabled: (enabled: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
  resetAll: () => void;
};

export const PREFS_STORAGE_KEY = "dbp:prefs:v1";

const defaults: PrefsState = {
  defaultMode: "exam",
  timerEnabled: true,
  theme: "system",
};

export const usePrefsStore = create<PrefsState & PrefsActions>()(
  persist(
    (set) => ({
      ...defaults,

      setDefaultMode: (defaultMode) => set({ defaultMode }),
      setTimerEnabled: (timerEnabled) => set({ timerEnabled }),
      setTheme: (theme) => set({ theme }),
      resetAll: () => set(defaults),
    }),
    {
      name: PREFS_STORAGE_KEY,
      version: 1,
      partialize: (state) => ({
        defaultMode: state.defaultMode,
        timerEnabled: state.timerEnabled,
        theme: state.theme,
      }),
    },
  ),
);
