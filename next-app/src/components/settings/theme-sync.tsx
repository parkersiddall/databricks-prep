"use client";

import { useEffect } from "react";

import { usePrefsStore } from "@/stores/prefs";

/**
 * Mirrors the stored theme preference onto `<html data-theme>`, which is what
 * the token blocks in globals.css key off.
 *
 * The initial value is applied before paint by `themeScript` below; this keeps
 * it in sync when the preference changes afterwards.
 */
export function ThemeSync() {
  const theme = usePrefsStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
  }, [theme]);

  return null;
}

/**
 * Runs before first paint to avoid a flash of the wrong theme.
 *
 * Reads the persisted preference directly rather than waiting for React to
 * hydrate, and stays silent if storage is unavailable or malformed. Kept in sync
 * with `PREFS_STORAGE_KEY` in stores/prefs.ts.
 */
export const themeScript = `(function(){try{var raw=localStorage.getItem('dbp:prefs:v1');if(!raw)return;var t=JSON.parse(raw).state.theme;if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`;
