import { designSystemFixtures } from "@shopblok/fixtures";
import { formatMoney, type Locale } from "@shopblok/i18n";
import type { DsContext } from "./types";

/** The context an entry renders with in `locale`: pure, so a test builds one for each locale. */
export function createContext(locale: Locale): DsContext {
  const fixture = designSystemFixtures[locale];
  return {
    locale,
    fixture,
    money: (amount) => formatMoney(amount, fixture.market.currency, fixture.market.htmlLang),
  };
}
