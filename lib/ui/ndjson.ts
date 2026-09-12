/**
 * Minimal newline-delimited JSON parsing for `POST /api/transcribe`'s
 * streamed response (`app/api/transcribe/route.ts`).
 *
 * This is this repo's only NDJSON producer and only NDJSON consumer, so
 * there's nothing to gain from a third-party SSE/NDJSON library — a manual
 * decode-and-split buffer is a dozen lines and easy to test in isolation.
 */

/**
 * Splits a buffer on `\n`, returning every complete line (blank lines
 * dropped) and whatever's left after the final newline — a line the stream
 * hasn't finished sending yet, to be prepended to the next chunk.
 */
export function splitNdjsonLines(buffer: string): { lines: string[]; rest: string } {
  const parts = buffer.split("\n");
  const rest = parts.pop() ?? "";
  return { lines: parts.filter((line) => line.trim().length > 0), rest };
}

/** Throws on malformed JSON — callers decide whether to skip or abort. */
export function parseNdjsonLine<T = unknown>(line: string): T {
  return JSON.parse(line) as T;
}

/**
 * Reads a fetch `Response`'s body as NDJSON, calling `onEvent` for each
 * parsed line as it arrives. A line that fails to parse is dropped rather
 * than thrown — one malformed heartbeat should never abort the whole read.
 */
export async function consumeNdjsonStream<T = unknown>(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: T) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { lines, rest } = splitNdjsonLines(buffer);
    buffer = rest;
    for (const line of lines) {
      try {
        onEvent(parseNdjsonLine<T>(line));
      } catch {
        // Malformed line — skip it, keep reading.
      }
    }
  }

  // Flush the decoder and anything left in the buffer with no trailing `\n`.
  buffer += decoder.decode();
  const { lines } = splitNdjsonLines(`${buffer}\n`);
  for (const line of lines) {
    try {
      onEvent(parseNdjsonLine<T>(line));
    } catch {
      // ditto
    }
  }
}
