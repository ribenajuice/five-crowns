import { requireGroupSession } from "@/lib/auth/session";

import { ReviewScreen } from "./ReviewScreen";

/**
 * `/review/{draftId}` — the Column Sweep review screen.
 *
 * Private like every other page: middleware only checks the cookie's
 * signature, so the full session check runs here before anything renders.
 * Everything else is client-side — the draft, the photo and both pick-lists
 * are all fetched after the gate, never server-rendered, so a signed-out
 * request never gets a fragment of the record in its HTML.
 */
export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  await requireGroupSession();
  const { draftId } = await params;

  return <ReviewScreen draftId={draftId} />;
}
