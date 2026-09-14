/**
 * `MergeSurvivorPicker` / `MergeSurvivorCard` — PRD criteria 156–157. Static-
 * markup smoke tests: neither card is pre-selected, the commit button starts
 * disabled, and picking a side is reflected by the caller's own `pickedId`
 * prop (no internal selection state to simulate without jsdom).
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { MergeSurvivorPicker } from "@/components/MergeSurvivorPicker";
import { mergeDetailSentencePlayer } from "@/lib/ui/copy";

describe("MergeSurvivorPicker", () => {
  const a = { id: "p1", name: "Samuel", gamesLabel: "0 games played" };
  const b = { id: "p2", name: "Sam", gamesLabel: "9 games played" };

  it("⚠️ criterion 156: neither card is pre-selected, and the commit button starts disabled", () => {
    const html = renderToStaticMarkup(
      MergeSurvivorPicker({
        a,
        b,
        pickedId: null,
        onPick: () => {},
        detailSentence: mergeDetailSentencePlayer,
        cancelHref: "/players/p1",
        busy: false,
        error: false,
        onCommit: () => {},
      }),
    );
    expect(html).toContain("Pick which one stays. Nothing is chosen for you.");
    expect(html).not.toContain("Stays");
    expect(html).not.toContain("Deleted");
    expect(html).toMatch(/<button[^>]*disabled/);
  });

  it("once a survivor is picked, labels both cards and states the detail + no-undo sentences", () => {
    const html = renderToStaticMarkup(
      MergeSurvivorPicker({
        a,
        b,
        pickedId: "p2",
        onPick: () => {},
        detailSentence: mergeDetailSentencePlayer,
        cancelHref: "/players/p1",
        busy: false,
        error: false,
        onCommit: () => {},
      }),
    );
    expect(html).toContain("Stays");
    expect(html).toContain("Deleted");
    expect(html).toContain(
      "Samuel is deleted for good. Every game, round, roster spot and photo of theirs moves to Sam.",
    );
    expect(html).toContain("There&#x27;s no undo, and no record that a merge happened.");
  });
});
