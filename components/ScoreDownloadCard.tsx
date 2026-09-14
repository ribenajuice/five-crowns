/**
 * The admin panel's score-download card — docs/DESIGN-SYSTEM.md § "Admin
 * panel — downloading the scores" (PRD criteria 102-109).
 *
 * Same bold-first-line / second-line card shape the API-key screen's resting
 * states use (`AdminKeyPanel`'s `StatusCard`), holding the fixed copy
 * verbatim. ⚠️ The word "backup" appears only to deny it: this card states
 * plainly what the file is and isn't *before* the button is tapped, so no
 * `Banner` is needed — nothing has gone right or wrong yet, it's a standing
 * fact.
 *
 * A plain `<a download>` rather than a fetch-and-blob: the browser already
 * sends the session cookie and honours `GET /api/admin/export`'s
 * `content-disposition` header for the real filename, so there is nothing a
 * client-side download would do better.
 */

import { buttonClasses } from "./Button";
import {
  SCORE_DOWNLOAD_BUTTON_LABEL,
  SCORE_DOWNLOAD_CARD_TITLE,
  SCORE_DOWNLOAD_COMMAND,
  SCORE_DOWNLOAD_MESSAGE_PREFIX,
} from "@/lib/ui/copy";

export function ScoreDownloadCard() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
        <p className="font-bold">{SCORE_DOWNLOAD_CARD_TITLE}</p>
        <p className="text-text-muted">
          {SCORE_DOWNLOAD_MESSAGE_PREFIX}{" "}
          <code className="rounded bg-sunk px-1 py-0.5 font-mono text-sm text-text">
            {SCORE_DOWNLOAD_COMMAND}
          </code>
        </p>
      </div>

      <a href="/api/admin/export" download className={buttonClasses("primary", { fullWidth: true })}>
        {SCORE_DOWNLOAD_BUTTON_LABEL}
      </a>
    </div>
  );
}
