/**
 * Structured logging.
 *
 * One line of JSON per event into CloudWatch (14-day retention, well inside the
 * free tier). Enough context to debug, and ⚠️ **never a secret, never a
 * password, never a raw IP address, never a player's name in an error path.**
 * There are no accounts, so nothing here identifies a person by design.
 */

export type LogLevel = "info" | "warn" | "error";

export type LogContext = Record<
  string,
  string | number | boolean | null | undefined
>;

function emit(level: LogLevel, event: string, context: LogContext = {}): void {
  const line = JSON.stringify({
    level,
    event,
    at: new Date().toISOString(),
    ...context,
  });

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (event: string, context?: LogContext) => emit("info", event, context),
  warn: (event: string, context?: LogContext) => emit("warn", event, context),
  error: (event: string, context?: LogContext) => emit("error", event, context),
};

/**
 * Summarise a thrown value for a log line.
 *
 * ⚠️ The stack stays in CloudWatch and never goes to the client — see
 * `lib/http/errors.ts`.
 */
export function describeError(error: unknown): LogContext {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack ?? null,
    };
  }
  return { errorName: "Unknown", errorMessage: String(error) };
}
