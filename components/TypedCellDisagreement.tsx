/**
 * `TypedCellDisagreement` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Layered onto one specific row of `ReadingCompare`'s grid, **on top of** that
 * row's ordinary "changed" tint, not instead of it — only this row carries the
 * extra fact that a person, not a model, put that value there (PRD criterion
 * 43). Reuses `SoftWarning`'s visual grammar (border, tint, icon, sentence);
 * never a generic banner, because the whole point is naming the one cell.
 */

import { SoftWarning } from "./SoftWarning";
import { typedCellDisagreementSentence } from "@/lib/ui/copy";

export function TypedCellDisagreement({ typed, read }: { typed: number; read: number }) {
  return <SoftWarning>{typedCellDisagreementSentence(typed, read)}</SoftWarning>;
}
