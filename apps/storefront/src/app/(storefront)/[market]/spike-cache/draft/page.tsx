import { getCurrentMarket } from "../../../../../lib/current-market";
import { readForPreview } from "../../../../../lib/spike/s1";

// S1 prototype: the draft-aware variant. `draftMode()` is read inside the cached function.
export default async function SpikeCacheDraft() {
  const market = await getCurrentMarket();
  const read = await readForPreview(market.language);
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">spike-cache/draft</h1>
      <p data-testid="s1-draft">{String(read.draft)}</p>
      <p data-testid="s1-run">{read.runId}</p>
      <ul data-testid="s1-titles">
        {read.titles.map((title) => (
          <li key={title}>{title}</li>
        ))}
      </ul>
    </main>
  );
}
