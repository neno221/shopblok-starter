import type { DefaultServerCellComponentProps, Field, Payload, UIFieldServerProps } from "payload";
import { cache } from "react";
import { openLanguages, pickAvailableLocales } from "../filter-available-locales";
import type { TranslationStatusCustom } from "../fields/translation-status";
import { DEFAULT_LOCALE, languageLabel, LOCALES } from "../locales";
import {
  fieldAnchor,
  gatherReads,
  readEveryLanguage,
  readManyInEveryLanguage,
  translationStatus,
  type LanguageStatus,
  type TranslationStatus,
  type TranslationTarget,
} from "../translation-status";
import { CountedWhenOpened, FocusLinkedField } from "./translation-status-client";
import "./translation-status.css";

/** The status's target, from the field's `admin.custom` (`fields/translation-status.ts`). */
function targetOf(field: Field): TranslationTarget | null {
  const custom = (field.admin?.custom ?? {}) as Partial<TranslationStatusCustom>;
  return custom.translationStatus ?? null;
}

/**
 * The open languages other than English, in the config's order: the ones the admin's language
 * selector offers (the open markets' languages, D95), so the status reports on what visitors read.
 */
async function languagesToReport(payload: Payload): Promise<string[]> {
  const open = await openLanguages((message) => payload.logger.warn(message));
  return pickAvailableLocales(LOCALES, open)
    .map((locale) => locale.code)
    .filter((code) => code !== DEFAULT_LOCALE);
}

/** The fields the status walks: the collection's or the global's, as Payload sanitized them. */
function fieldsOf(payload: Payload, target: TranslationTarget): Field[] {
  if ("collection" in target) return payload.collections[target.collection]?.config.fields ?? [];
  return payload.config.globals.find((global) => global.slug === target.global)?.fields ?? [];
}

const COUNT = (status: LanguageStatus) =>
  status.state === "complete"
    ? "complete"
    : status.state === "not-started"
      ? "not started"
      : `${status.missing.length} to translate`;

/** The status in the form's sidebar (D107). Links open the language's form at the text. */
export function TranslationStatusView({
  status,
  languages,
  live = true,
}: {
  status: TranslationStatus | null;
  languages: readonly string[];
  /** In the form: the note after a save, and the jump to a linked field (left out in a unit test). */
  live?: boolean;
}) {
  const body =
    status === null ? (
      <p className="translation-status__note">Save it once to see what each language lacks.</p>
    ) : languages.length === 0 ? (
      <p className="translation-status__note">No open market has a language besides English.</p>
    ) : status.texts === 0 ? (
      <p className="translation-status__note">English has no texts to translate yet.</p>
    ) : (
      <ul className="translation-status__languages">
        {status.languages.map((each) => {
          const name = languageLabel(each.language);
          const summary = (
            <>
              <span className="translation-status__language" lang={each.language}>
                {name}
              </span>{" "}
              <span className="translation-status__count">{COUNT(each)}</span>
            </>
          );
          return (
            <li key={each.language} data-language={each.language} data-state={each.state}>
              {each.state === "complete" ? (
                summary
              ) : (
                <details open={each.state === "partial"}>
                  <summary>{summary}</summary>
                  <ul className="translation-status__missing">
                    {each.missing.map((missing, index) => (
                      <li key={index}>
                        <a
                          href={`?locale=${encodeURIComponent(each.language)}#${fieldAnchor(missing.path)}`}
                        >
                          {missing.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    );
  return (
    <section className="translation-status" aria-labelledby="translation-status-title">
      <h3 id="translation-status-title" className="translation-status__title">
        Translation
      </h3>
      {body}
      {live ? (
        <>
          <CountedWhenOpened />
          <FocusLinkedField />
        </>
      ) : null}
    </section>
  );
}

/**
 * The sidebar's server component (D107): one read of the document in every language without the
 * fallback, then each open language's count. A save does not count again (D107: computed when the
 * form opens); the note after a save links to the form, which does.
 */
export async function TranslationStatusField({ field, id, payload, req }: UIFieldServerProps) {
  const target = targetOf(field);
  if (target === null) return null;
  const [languages, doc] = await Promise.all([
    languagesToReport(payload),
    readEveryLanguage(payload, target, id, req.user),
  ]);
  const status =
    doc === null
      ? null
      : translationStatus({
          fields: fieldsOf(payload, target),
          doc,
          languages,
          blocks: payload.config.blocks ?? [],
          user: req.user,
        });
  return <TranslationStatusView status={status} languages={languages} />;
}

/** One gatherer per list render and collection, so a list page's cells share one read. */
const listReads = cache((payload: Payload, collection: "pages" | "posts") =>
  gatherReads((ids) => readManyInEveryLanguage(payload, collection, ids)),
);
const listLanguages = cache((payload: Payload) => languagesToReport(payload));

/** The list column's text: what is left, language by language, or that every language is done. */
export function cellText(status: TranslationStatus, languages: readonly string[]): string {
  if (languages.length === 0 || status.texts === 0) return "—";
  const open = status.languages.filter((each) => each.state !== "complete");
  if (open.length === 0) return "Complete";
  return open.map((each) => `${languageLabel(each.language)}: ${COUNT(each)}`).join("; ");
}

/** The list's "Translation" column on `pages` and `posts` (D107): one read per list page. */
export async function TranslationStatusCell({
  field,
  payload,
  rowData,
}: DefaultServerCellComponentProps) {
  const target = targetOf(field);
  const id = rowData["id"] as number | string | undefined;
  if (target === null || !("collection" in target) || id === undefined) return null;
  const [languages, doc] = await Promise.all([
    listLanguages(payload),
    listReads(payload, target.collection)(id),
  ]);
  if (doc === undefined) return <span>—</span>;
  const status = translationStatus({
    fields: fieldsOf(payload, target),
    doc,
    languages,
    blocks: payload.config.blocks ?? [],
  });
  return <span className="translation-status__cell">{cellText(status, languages)}</span>;
}
