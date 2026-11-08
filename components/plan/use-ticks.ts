"use client";

import { useSyncExternalStore } from "react";
import { readTicks, toggleTick, writeTicks, type TickStorage } from "@/lib/plan-ticks";

const NONE: readonly string[] = [];
const listeners = new Set<() => void>();
let ticks: readonly string[] | null = null;

/** Merely asking for storage can throw when a browser blocks it. */
function browserStorage(): TickStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function currentTicks(): readonly string[] {
  if (ticks === null) {
    const storage = browserStorage();
    ticks = storage ? readTicks(storage) : NONE;
  }
  return ticks;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function toggle(id: string) {
  ticks = toggleTick(currentTicks(), id);
  const storage = browserStorage();
  if (storage) writeTicks(storage, ticks);
  listeners.forEach((listener) => listener());
}

/** Replaces all ticks at once, for "Already done" and its undo. */
function replace(next: readonly string[]) {
  ticks = next;
  const storage = browserStorage();
  if (storage) writeTicks(storage, ticks);
  listeners.forEach((listener) => listener());
}

/** Every checkbox and the progress line share this, so they stay in step. */
export function useTicks() {
  return { ticks: useSyncExternalStore(subscribe, currentTicks, () => NONE), toggle, replace };
}
