"use client";

import { useEffect, useRef } from "react";

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Calls `handler` when `key` is pressed without modifiers, unless focus is in
 * a text field or a dialog/menu is open. `Escape` always fires.
 */
export function useShortcut(key: string, handler: (event: KeyboardEvent) => void, enabled = true) {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== key || event.defaultPrevented) return;
      if (key !== "Escape") {
        if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
        if (document.querySelector("[role=dialog], [role=menu]")) return;
      }
      latest.current(event);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, enabled]);
}
