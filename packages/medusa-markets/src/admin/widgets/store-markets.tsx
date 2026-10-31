import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { PencilSquare } from "@medusajs/icons";
import type { AdminStore, DetailWidgetProps } from "@medusajs/framework/types";
import { Container, IconButton, Text } from "@medusajs/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SettingsDrawer } from "../components/settings-drawer";
import { PanelError, PanelHeader, PanelLoading, Warnings } from "../components/panel";
import { useMarkets } from "../lib/api";
import { languageName, marketName } from "../lib/format";
import { showsLocale } from "../lib/settings-form";

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
    <Text size="small" leading="compact" weight="plus">
      {label}
    </Text>
    <Text size="small" leading="compact">
      {value}
    </Text>
  </div>
);

/**
 * "Markets" on the Store page (D93), beside Medusa's own Locales and Default region: the primary
 * country, the fallback market, the `<html lang>` override of each language in use and the
 * warnings of what is stored. A language's store locale is listed, and chosen, only when the store
 * has two or more locales of it or the saved one is gone. No locale is added or removed here.
 */
const StoreMarketsPanel = ({ data: store }: DetailWidgetProps<AdminStore>) => {
  const { t, i18n } = useTranslation("markets");
  // The locales and the default region as Medusa's form leaves them: a change reads them again.
  const signature = [
    store.default_region_id ?? "",
    ...(store.supported_locales ?? []).map((locale) => locale.locale_code),
  ].join(",");
  const markets = useMarkets(`store:${signature}`);
  const [editing, setEditing] = useState(false);
  const overview = markets.data;

  const countryNames = Object.fromEntries(
    (overview?.countries ?? []).map((country) => [country.code, country.name]),
  );
  const languagesInUse = [
    ...new Set((overview?.countries ?? []).flatMap((country) => country.languages)),
  ];
  const primary = overview?.settings.primary_country ?? "";
  const fallback = overview?.settings.fallback_market ?? "";

  return (
    <Container className="divide-y p-0" id="markets-store-panel">
      <PanelHeader
        description={t("store.description")}
        action={
          overview === undefined ? undefined : (
            <IconButton
              size="small"
              variant="transparent"
              aria-label={t("store.edit")}
              // The form starts from what was read: not while the markets are read again.
              disabled={markets.isFetching}
              onClick={() => setEditing(true)}
            >
              <PencilSquare />
            </IconButton>
          )
        }
      />
      {markets.isPending ? (
        <PanelLoading />
      ) : markets.isError || overview === undefined ? (
        <PanelError error={markets.error} />
      ) : (
        <>
          {overview.problems.length > 0 && (
            <div className="px-6 py-4">
              <Warnings problems={overview.problems} title={t("store.warnings")} />
            </div>
          )}
          <Row
            label={t("store.primaryCountry")}
            value={primary === "" ? t("none") : (countryNames[primary] ?? primary.toUpperCase())}
          />
          <Row
            label={t("store.fallbackMarket")}
            value={fallback === "" ? t("none") : marketName(fallback, countryNames, i18n.language)}
          />
          {languagesInUse.map((code) => {
            const name = languageName(code, i18n.language);
            const row = overview.languages.find((language) => language.code === code);
            return (
              <Row
                key={`html-${code}`}
                label={t("store.htmlLang", { language: name })}
                value={row?.html_lang ?? t("store.htmlLangDefault")}
              />
            );
          })}
          {languagesInUse
            .filter((code) => showsLocale(overview, code))
            .map((code) => (
              <Row
                key={`locale-${code}`}
                label={t("store.locale", {
                  language: languageName(code, i18n.language),
                })}
                value={
                  overview.languages.find((language) => language.code === code)?.medusa_locale ??
                  t("none")
                }
              />
            ))}
          {editing && (
            <SettingsDrawer
              overview={overview}
              languagesInUse={languagesInUse}
              open
              onOpenChange={(open) => !open && setEditing(false)}
            />
          )}
        </>
      )}
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "store.details",
  id: "shopblok-markets-store-panel",
});

export default StoreMarketsPanel;
