"use client";

import { useSyncExternalStore } from "react";
import { NO_SAVED_ADJUSTMENTS, readAdjustments, writeAdjustments, type SavedAdjustments } from "@/lib/plan-adjustments";

const listeners = new Set<() => void>();
let saved: SavedAdjustments | null = null;

/** Merely asking for storage can throw when a browser blocks it. */
function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function current(): SavedAdjustments {
  if (saved === null) {
    const storage = browserStorage();
    saved = storage ? readAdjustments(storage) : NO_SAVED_ADJUSTMENTS;
  }
  return saved;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function update(change: (before: SavedAdjustments) => SavedAdjustments) {
  saved = change(current());
  const storage = browserStorage();
  if (storage) writeAdjustments(storage, saved);
  listeners.forEach((listener) => listener());
}

/** The self-check and set-aside blocks, saved in this browser only. */
export function useAdjustments() {
  return { saved: useSyncExternalStore(subscribe, current, () => NO_SAVED_ADJUSTMENTS), update };
}
