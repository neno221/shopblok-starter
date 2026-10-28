import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { RefreshOnSave } from "../../../../../components/cms/refresh-on-save";
import { readPageBySlug } from "../../../../../lib/cms/pages";
import { getCurrentMarket } from "../../../../../lib/current-market";
import { e2eRoutesEnabled, env } from "../../../../../lib/env";

// Test-only (404 unless E2E_TEST_ROUTES=true; T59): a CMS page read the way the shop's pages read
// one (D73), for `cms-preview.spec.ts` until T65's `[...slug]` route takes over. Draft Mode is read
// outside the cached read and passed in; the live-preview island renders only in Draft Mode.
// Dynamic and blocking (`instant = false`, as the cart page): the gate is read per request.

export const instant = false;
export default async function E2eCmsPage({ params }: PageProps<"/[market]/e2e-cms/[slug]">) {
  await connection();
  if (!e2eRoutesEnabled()) notFound();
  const [{ slug }, market, { isEnabled: draft }] = await Promise.all([
    params,
    getCurrentMarket(),
    draftMode(),
  ]);
  const page = await readPageBySlug({ market, draft }, slug);
  if (page === null) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 data-testid="cms-title" className="text-3xl">
        {page.title}
      </h1>
      <p data-testid="cms-draft">{draft ? "draft" : "published"}</p>
      {draft ? (
        <RefreshOnSave serverURL={env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:8000"} />
      ) : null}
    </main>
  );
}
