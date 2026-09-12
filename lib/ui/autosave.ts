/**
 * The autosave debounce.
 *
 * `docs/ARCHITECTURE.md` § The Stage 2 interface: `PUT /api/drafts/{id}`,
 * debounced ~1s on the client, and flushed on `visibilitychange` / `pagehide`
 * so nothing typed is lost to a tab switch or a force-quit (PRD criterion 28).
 * Pure and dependency-free — no `fetch`, no timers beyond the platform's.
 */

export interface Debounced<Args extends unknown[]> {
  (...args: Args): void;
  /** Run the pending call now, if there is one. */
  flush(): void;
  /** Drop the pending call without running it. */
  cancel(): void;
}

export function createDebouncer<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): Debounced<Args> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: Args | null = null;

  function runPending(): void {
    if (pending === null) return;
    const args = pending;
    pending = null;
    fn(...args);
  }

  function debounced(...args: Args): void {
    pending = args;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      runPending();
    }, waitMs);
  }

  debounced.flush = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    runPending();
  };

  debounced.cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    pending = null;
  };

  return debounced;
}
