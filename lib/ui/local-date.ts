/**
 * The browser's local calendar day.
 *
 * `docs/ARCHITECTURE.md` § Data model, `game`: "today" means today where the
 * founder is, not on the server — a UTC `new Date()` names the previous day
 * for the first ten-to-eleven hours of every Australian day. The default date
 * is therefore resolved here, in the browser, and sent with the request; the
 * server never invents one.
 */

export function localCalendarDay(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
