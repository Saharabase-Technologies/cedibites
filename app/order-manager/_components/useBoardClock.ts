'use client';

import { useSyncExternalStore } from 'react';

/**
 * One clock for the whole board.
 *
 * Every ticket shows a live age, so something has to tick once a second. The
 * old board did it by bumping a counter in the page's own state, which re-ran
 * the whole tree — grouping, sorting, and every card and icon — on every tick,
 * on top of the once-a-second refetch it was already doing.
 *
 * Here a single module-level interval feeds `useSyncExternalStore`, so only the
 * components that actually display a time subscribe to it. The tickets
 * themselves are memoised and never re-render for the clock.
 */

let now = Date.now();
const subscribers = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function start() {
  if (timer) return;
  timer = setInterval(() => {
    now = Date.now();
    subscribers.forEach((fn) => fn());
  }, 1000);
}

function stop() {
  if (timer && subscribers.size === 0) {
    clearInterval(timer);
    timer = null;
  }
}

function subscribe(onChange: () => void): () => void {
  subscribers.add(onChange);
  start();
  return () => {
    subscribers.delete(onChange);
    stop();
  };
}

function getSnapshot(): number {
  return now;
}

/** Server render has no clock; a stable value keeps hydration quiet. */
function getServerSnapshot(): number {
  return 0;
}

export function useBoardClock(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
