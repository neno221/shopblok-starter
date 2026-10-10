import { getCurrentMarket } from "../../../../lib/current-market";
import { readPublished } from "../../../../lib/spike/s1";

// S1 prototype: published pages through the Local API inside `use cache` (tag pages:<locale>).
export default async function SpikeCache() {
  const market = await getCurrentMarket();
  const read = await readPublished(market.language);
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">spike-cache</h1>
      <p data-testid="s1-language">{market.language}</p>
      <p data-testid="s1-run">{read.runId}</p>
      <p data-testid="s1-at">{read.at}</p>
      <ul data-testid="s1-titles">
        {read.titles.map((title) => (
          <li key={title}>{title}</li>
        ))}
      </ul>
    </main>
  );
}
