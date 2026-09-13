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

export interface AutosaveOutcome {
  /** Non-null when the response means "this draft is already saved" — where to send the tab. */
  redirectGameId: string | null;
  /** True when the autosave genuinely failed and the "hasn't saved yet" banner should show. */
  autosaveError: boolean;
}

/**
 * Interprets `PUT /api/drafts/{id}`'s response for the review screen's
 * autosave.
 *
 * ⚠️ Security review: a `409` is not always "already saved" — `PUT
 * /api/drafts/{id}`'s immutability guard also answers 409 for a `photoId`
 * mismatch (`docs/DECISIONS.md`, 2026-09-14, "Editing a saved game", decision
 * 6). This used to be conflated: any 409 whose re-fetched draft didn't (yet,
 * or ever) carry a `savedGameId` was treated as nothing having gone wrong at
 * all — the correction silently failed with no error shown. `freshSavedGameId`
 * is the re-fetched draft's own `savedGameId`, read *after* the 409, so this
 * only ever calls it "already saved" when that's actually true.
 */
export function resolveAutosaveOutcome(
  status: number,
  freshSavedGameId: string | null | undefined,
): AutosaveOutcome {
  if (status === 409) {
    return freshSavedGameId
      ? { redirectGameId: freshSavedGameId, autosaveError: false }
      : { redirectGameId: null, autosaveError: true };
  }
  const ok = status >= 200 && status < 300;
  return { redirectGameId: null, autosaveError: !ok };
}
