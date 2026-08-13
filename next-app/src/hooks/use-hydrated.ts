"use client";

import { useSyncExternalStore } from "react";

/** The slice of a persisted Zustand store this hook needs. */
type PersistedStore = {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (listener: () => void) => () => void;
  };
};

/**
 * True once a persisted store has read from `localStorage`.
 *
 * Gate anything that renders persisted state behind this, or the server's HTML
 * (which never sees `localStorage`) will not match the client's.
 *
 * `useSyncExternalStore` is the right primitive rather than `useState` +
 * `useEffect`: it takes a separate **server snapshot**, pinned to `false`, which
 * React also uses for the client's hydrating render. That matters because
 * Zustand's localStorage persistence rehydrates synchronously while the store
 * module is evaluated, so `hasHydrated()` is already true by the client's first
 * render — reading it directly would reintroduce the very mismatch this hook
 * exists to prevent.
 */
export function useHydrated(store: PersistedStore): boolean {
  return useSyncExternalStore(
    (onStoreChange) => store.persist.onFinishHydration(onStoreChange),
    () => store.persist.hasHydrated(),
    () => false,
  );
}
