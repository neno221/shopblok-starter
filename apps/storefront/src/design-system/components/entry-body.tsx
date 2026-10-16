import { catalogs } from "@shopblok/i18n";
import type { DsContext, DsEntry } from "../types";
import { Section } from "./section";

const copy = catalogs.en.designSystem;

/**
 * What an entry looks like: the live render, then the states matrix, all in the page's locale.
 * The entry page shows it under the entry's title and the frame shows it alone, so a frame is
 * exactly the page's render (D34's checks run on frames). Foundations have no states.
 */
export function EntryBody({ entry, ctx }: { entry: DsEntry; ctx: DsContext }) {
  const states = entry.states ?? [];
  // An atom's render is in the locale; a Foundations page is English documentation that shows its
  // samples in the locale (and marks them), so the language of each part is stated (WCAG 3.1.2).
  const contentLang = entry.group === "foundations" ? "en" : ctx.fixture.market.htmlLang;
  return (
    <>
      <Section id="live-render" title={copy.sections.liveRender}>
        <div lang={contentLang}>{entry.live(ctx)}</div>
      </Section>
      {states.length > 0 && (
        <Section id="states" title={copy.sections.states}>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4">
            {states.map((state) => (
              <li key={state.id} data-state={state.id} className="rounded-lg border p-4">
                <h3 lang="en" className="text-sm font-medium">
                  {state.label}
                </h3>
                {state.description !== undefined && (
                  <p lang="en" className="text-muted-foreground mt-1 text-xs">
                    {state.description}
                  </p>
                )}
                <div lang={ctx.fixture.market.htmlLang} className="mt-3">
                  {state.render(ctx)}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
