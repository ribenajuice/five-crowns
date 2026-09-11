/**
 * Structured API errors.
 *
 * ⚠️ Two rules, both load-bearing:
 *   1. The client gets a stable `code`, a human sentence and the right status.
 *      **Never a stack trace, never an internal message, never a parameter
 *      path.** A leaked SSM path or SQL fragment tells an attacker exactly what
 *      to poke at.
 *   2. Everything interesting is logged server-side with enough context to
 *      debug it.
 *
 * The sentences are in the product's voice: plain, blunt, say what to do next.
 */

import { NextResponse } from "next/server";

import { describeError, log } from "@/lib/log";

export type ErrorCode =
  | "bad_request"
  | "invalid_credentials"
  | "rate_limited"
  | "unauthorised"
  | "forbidden"
  | "not_found"
  | "unsupported_media_type"
  | "not_configured"
  | "server_error";

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  invalid_credentials: 401,
  unauthorised: 401,
  forbidden: 403,
  unsupported_media_type: 415,
  rate_limited: 429,
  not_found: 404,
  not_configured: 503,
  server_error: 500,
};

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string };
}

export function apiError(
  code: ErrorCode,
  message: string,
  init?: { headers?: HeadersInit },
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code, message } },
    { status: STATUS[code], headers: init?.headers },
  );
}

/**
 * The last line of defence in a route handler. Logs the detail, tells the
 * browser nothing.
 */
export function serverError(
  event: string,
  error: unknown,
  context: Record<string, string | number | boolean | null | undefined> = {},
): NextResponse<ApiErrorBody> {
  log.error(event, { ...context, ...describeError(error) });
  return apiError(
    "server_error",
    "Something went wrong at our end. Try again in a moment.",
  );
}
