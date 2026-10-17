import { catalogs } from "@shopblok/i18n";
import { entryPath, framePath } from "../catalog";
import type { DsContext, DsEntry } from "../types";
import { EntryBody } from "./entry-body";
import { LocaleToggle } from "./locale-toggle";
import { PropsTable } from "./props-table";
import { Section } from "./section";
import { viewportWidths } from "../viewport-widths";
import { ViewportSwitcher } from "./viewport-switcher";

const copy = catalogs.en.designSystem;

/**
 * An entry's page (SPEC §9.6): its title, the locale toggle, the live render and the states, its
 * props when it has a contract (D41), the a11y notes and the viewport switcher. The render and the
 * states are `EntryBody`, the same component the frame shows alone.
 */
export function EntryPage({ entry, ctx }: { entry: DsEntry; ctx: DsContext }) {
  const { market } = ctx.fixture;
  return (
    <article>
      <p className="text-muted-foreground text-sm">{copy.groups[entry.group]}</p>
      <h1 className="text-3xl font-semibold">{entry.label}</h1>
      <p className="mt-2 max-w-prose">{entry.summary}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <LocaleToggle current={ctx.locale} hrefFor={(locale) => entryPath(locale, entry)} />
        <p className="text-muted-foreground text-sm">
          {copy.fixtures.market}: {market.key} · {copy.fixtures.currency}: {market.currency}
        </p>
      </div>
      <div className="mt-10">
        <EntryBody entry={entry} ctx={ctx} />
      </div>
      {entry.contract !== undefined && (
        <div className="mt-10">
          <Section id="props" title={copy.sections.props}>
            <PropsTable contract={entry.contract} />
          </Section>
        </div>
      )}
      <div className="mt-10">
        <Section id="a11y" title={copy.sections.a11y}>
          <ul className="list-disc space-y-1 ps-5">
            {entry.a11y.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Section>
      </div>
      <div className="mt-10">
        <Section id="viewports" title={copy.sections.viewports}>
          <ViewportSwitcher
            frameSrc={framePath(ctx.locale, entry)}
            entryLabel={entry.label}
            widths={viewportWidths()}
            labels={{
              all: copy.viewports.all,
              group: copy.viewports.group,
              scaleNote: copy.viewports.scaleNote,
              title: copy.viewports.title,
              openFrame: copy.viewports.openFrame,
            }}
          />
        </Section>
      </div>
    </article>
  );
}
