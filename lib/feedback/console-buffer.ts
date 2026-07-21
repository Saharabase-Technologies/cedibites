/**
 * Console ring buffer. Patches console.log/info/warn/error plus window.onerror
 * and unhandledrejection, keeping the last ~200 entries.
 *
 * I4 (chain, never replace): run the ORIGINAL console fn first, then record.
 * Never call console.* from inside the capture path — that recurses forever.
 * I1 (never throw): every push is wrapped; a capture failure is swallowed.
 */
import { RingBuffer } from './ring-buffer';
import type { ConsoleEntry, ConsoleLevel } from './types';

const ENTRIES = new RingBuffer<ConsoleEntry>(200);
const MAX_ENTRY_BYTES = 2048;

let installed = false;

/** Serialize one console arg defensively — never let it throw, never explode. */
function serializeArg(arg: unknown): string {
  try {
    if (arg instanceof Error) {
      const stack = (arg.stack || '').split('\n').slice(0, 5).join('\n');
      return `${arg.name}: ${arg.message}\n${stack}`;
    }
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'object' && arg !== null) {
      const seen = new WeakSet();
      return JSON.stringify(arg, (_k, v) => {
        if (typeof v === 'object' && v !== null) {
          if (seen.has(v)) return '[Circular]';
          seen.add(v);
        }
        return v;
      });
    }
    return String(arg);
  } catch {
    return '[unserializable]';
  }
}

function record(level: ConsoleLevel, args: unknown[]): void {
  try {
    let message = args.map(serializeArg).join(' ');
    if (message.length > MAX_ENTRY_BYTES) {
      message = message.slice(0, MAX_ENTRY_BYTES) + '…[truncated]';
    }
    ENTRIES.push({ level, message, at: Date.now() });
  } catch {
    /* I1 — capture must never break the app */
  }
}

/** Install the console patch once. Idempotent. */
export function installConsoleCapture(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  (['log', 'info', 'warn', 'error'] as ConsoleLevel[]).forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args); // I4: original first, always
      record(level, args);
    };
  });

  window.addEventListener('error', (e) => {
    record('error', [e.message, e.error instanceof Error ? e.error : '']);
  });
  window.addEventListener('unhandledrejection', (e) => {
    record('error', ['Unhandled promise rejection:', e.reason]);
  });
}

export function consoleEntries(): ConsoleEntry[] {
  return ENTRIES.toArray();
}
