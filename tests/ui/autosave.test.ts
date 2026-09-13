import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDebouncer, resolveAutosaveOutcome } from "@/lib/ui/autosave";

describe("createDebouncer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits the full delay before calling, and only calls once for a burst", () => {
    const fn = vi.fn();
    const debounced = createDebouncer(fn, 1000);

    debounced("a");
    debounced("b");
    debounced("c");
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(999);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("c");
  });

  it("flush() runs a pending call immediately (visibilitychange / pagehide, criterion 28)", () => {
    const fn = vi.fn();
    const debounced = createDebouncer(fn, 1000);

    debounced("x");
    debounced.flush();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("x");

    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1); // no second, delayed call follows
  });

  it("flush() is a no-op when nothing is pending", () => {
    const fn = vi.fn();
    const debounced = createDebouncer(fn, 1000);
    debounced.flush();
    expect(fn).not.toHaveBeenCalled();
  });

  it("cancel() drops the pending call", () => {
    const fn = vi.fn();
    const debounced = createDebouncer(fn, 1000);
    debounced("dropped");
    debounced.cancel();
    vi.advanceTimersByTime(2000);
    expect(fn).not.toHaveBeenCalled();
  });

  it("restarts the wait on every call, so a steady stream of edits never fires mid-stream", () => {
    const fn = vi.fn();
    const debounced = createDebouncer(fn, 1000);

    for (let i = 0; i < 5; i += 1) {
      debounced(i);
      vi.advanceTimersByTime(500);
    }
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(4);
  });
});

describe("resolveAutosaveOutcome", () => {
  it("a plain success clears any error and never redirects", () => {
    expect(resolveAutosaveOutcome(200, undefined)).toEqual({
      redirectGameId: null,
      autosaveError: false,
    });
  });

  it("a plain failure (e.g. offline, 500) surfaces the autosave error", () => {
    expect(resolveAutosaveOutcome(500, undefined)).toEqual({
      redirectGameId: null,
      autosaveError: true,
    });
  });

  it("409 with a real savedGameId on the re-fetched draft redirects, no error shown", () => {
    expect(resolveAutosaveOutcome(409, "game-123")).toEqual({
      redirectGameId: "game-123",
      autosaveError: false,
    });
  });

  it("⚠️ regression: a 409 that ISN'T an already-saved draft (e.g. the photoId immutability guard) surfaces an error rather than being silently swallowed", () => {
    expect(resolveAutosaveOutcome(409, null)).toEqual({
      redirectGameId: null,
      autosaveError: true,
    });
    expect(resolveAutosaveOutcome(409, undefined)).toEqual({
      redirectGameId: null,
      autosaveError: true,
    });
  });
});
