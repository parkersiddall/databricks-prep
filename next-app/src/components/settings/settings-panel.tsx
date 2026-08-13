"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useHydrated } from "@/hooks/use-hydrated";
import { useMissedStore } from "@/stores/missed";
import { usePrefsStore, type ThemePreference } from "@/stores/prefs";
import { useSessionsStore } from "@/stores/sessions";

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function SettingsPanel() {
  const hydrated = useHydrated(usePrefsStore);

  const theme = usePrefsStore((state) => state.theme);
  const defaultMode = usePrefsStore((state) => state.defaultMode);
  const timerEnabled = usePrefsStore((state) => state.timerEnabled);
  const setTheme = usePrefsStore((state) => state.setTheme);
  const setDefaultMode = usePrefsStore((state) => state.setDefaultMode);
  const setTimerEnabled = usePrefsStore((state) => state.setTimerEnabled);
  const resetPrefs = usePrefsStore((state) => state.resetAll);

  const resetSessions = useSessionsStore((state) => state.resetAll);
  const resetMissed = useMissedStore((state) => state.resetAll);

  const [confirmReset, setConfirmReset] = useState(false);
  const [didReset, setDidReset] = useState(false);

  if (!hydrated) {
    return (
      <div className="h-72 animate-pulse rounded-lg bg-surface" aria-busy="true" />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-border bg-surface-raised p-5">
        <h2 className="font-medium">Appearance</h2>
        <fieldset className="mt-3">
          <legend className="sr-only">Theme</legend>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={theme === option.value ? "primary" : "secondary"}
                aria-pressed={theme === option.value}
                onClick={() => setTheme(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="rounded-lg border border-border bg-surface-raised p-5">
        <h2 className="font-medium">Exam defaults</h2>
        <p className="mt-1 text-sm text-muted">
          Pre-selected on the start screen. You can still change either per
          sitting.
        </p>

        <fieldset className="mt-4">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted">
            Default mode
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={defaultMode === "exam" ? "primary" : "secondary"}
              aria-pressed={defaultMode === "exam"}
              onClick={() => setDefaultMode("exam")}
            >
              Exam
            </Button>
            <Button
              size="sm"
              variant={defaultMode === "study" ? "primary" : "secondary"}
              aria-pressed={defaultMode === "study"}
              onClick={() => setDefaultMode("study")}
            >
              Study
            </Button>
          </div>
        </fieldset>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={timerEnabled}
            onChange={(event) => setTimerEnabled(event.target.checked)}
            className="accent-primary"
          />
          Use the time limit by default
        </label>
      </section>

      <section className="rounded-lg border border-danger/40 bg-surface-raised p-5">
        <h2 className="font-medium">Your data</h2>
        <p className="mt-1 text-sm text-muted">
          Everything is stored in this browser only — there is no account and
          nothing is sent anywhere. Clearing your browser data removes it, and it
          does not follow you to another device.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            Reset all progress
          </Button>
          {didReset && (
            <span role="status" className="text-sm text-success">
              Progress cleared.
            </span>
          )}
        </div>
      </section>

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset all progress?"
        description="This deletes every in-progress and completed exam, your missed-question lists, and these preferences. It cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                resetSessions();
                resetMissed();
                resetPrefs();
                setConfirmReset(false);
                setDidReset(true);
              }}
            >
              Reset everything
            </Button>
          </>
        }
      />
    </div>
  );
}
