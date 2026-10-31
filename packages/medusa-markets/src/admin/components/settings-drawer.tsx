import { Button, Checkbox, Drawer, Input, Label, Select, Text, toast } from "@medusajs/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useSaveSettings } from "../lib/api";
import { languageName, localesOfLanguage, marketName } from "../lib/format";
import { failureOf } from "../lib/refusal";
import { localeIsGone, settingsBody, showsLocale, startLocale } from "../lib/settings-form";
import type { MarketsOverview } from "../lib/types";
import { DrawerHeading, SaveFailure } from "./panel";

/**
 * The drawer of the Store page's panel (D93): the primary country and the fallback market, chosen
 * from what is open, the `<html lang>` override of each language in use, and, only for a language
 * that has two or more store locales (or whose saved one is gone), which locale it uses. It adds
 * or removes no locale: the store's locales are Medusa's own, in the Locales section of the page.
 * A save sends only what the admin changed (`settingsBody`).
 */
export const SettingsDrawer = ({
  overview,
  languagesInUse,
  open,
  onOpenChange,
}: {
  overview: MarketsOverview;
  languagesInUse: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => (
  <Drawer open={open} onOpenChange={onOpenChange}>
    <Drawer.Content>
      <SettingsForm
        overview={overview}
        languagesInUse={languagesInUse}
        onClose={() => onOpenChange(false)}
      />
    </Drawer.Content>
  </Drawer>
);

const SettingsForm = ({
  overview,
  languagesInUse,
  onClose,
}: {
  overview: MarketsOverview;
  languagesInUse: string[];
  onClose: () => void;
}) => {
  const { t, i18n } = useTranslation("markets");
  const save = useSaveSettings();
  const failure = save.isError ? failureOf(save.error) : null;

  const openCountries = overview.countries.filter((country) => country.enabled);
  const countryNames = Object.fromEntries(
    overview.countries.map((country) => [country.code, country.name]),
  );
  const openMarkets = openCountries.flatMap((country) =>
    country.languages.map((language) => `${language}-${country.code}`),
  );

  const [primary, setPrimary] = useState(overview.settings.primary_country ?? "");
  const [fallback, setFallback] = useState(overview.settings.fallback_market ?? "");
  const rowOf = (code: string) => overview.languages.find((row) => row.code === code);
  const [htmlLang, setHtmlLang] = useState<Record<string, string>>(() =>
    Object.fromEntries(languagesInUse.map((code) => [code, rowOf(code)?.html_lang ?? ""])),
  );
  const [locale, setLocale] = useState<Record<string, string>>(() =>
    Object.fromEntries(languagesInUse.map((code) => [code, startLocale(overview, code)])),
  );
  // D91's way to follow a default region that differs from the primary country's: save the
  // primary country again, which sets Medusa's default region to its region.
  const regionDiffers = overview.problems.some(
    (problem) => problem.code === "default_region_differs",
  );
  const [matchDefaultRegion, setMatchDefaultRegion] = useState(false);

  const body = settingsBody(overview, languagesInUse, {
    primary,
    fallback,
    htmlLang,
    locale,
    matchDefaultRegion: regionDiffers && matchDefaultRegion,
  });

  const submit = () =>
    save.mutate(body, {
      onSuccess: () => {
        toast.success(t("store.saved"));
        onClose();
      },
    });

  return (
    <>
      <DrawerHeading title={t("store.drawerTitle")} description={t("store.drawerDescription")} />
      <Drawer.Body className="flex flex-1 flex-col gap-y-6 overflow-y-auto">
        {failure !== null && (
          <SaveFailure
            title={t("store.refused")}
            reasons={failure.reasons}
            message={t("store.failed", { message: failure.message })}
          />
        )}
        {openCountries.length === 0 && (
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {t("store.noOpenCountry")}
          </Text>
        )}

        <div className="flex flex-col gap-y-2">
          <Label htmlFor="markets-primary" size="small" weight="plus">
            {t("store.primaryCountry")}
          </Label>
          <Select size="small" value={primary} onValueChange={setPrimary}>
            <Select.Trigger id="markets-primary" aria-describedby="markets-primary-hint">
              <Select.Value placeholder={t("store.choose")} />
            </Select.Trigger>
            <Select.Content>
              {openCountries.map((country) => (
                <Select.Item key={country.code} value={country.code}>
                  {country.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Text
            id="markets-primary-hint"
            size="small"
            leading="compact"
            className="text-ui-fg-subtle"
          >
            {t("store.primaryCountryHint")}
          </Text>
          {regionDiffers && (
            <div className="flex items-center gap-x-2">
              <Checkbox
                id="markets-match-region"
                checked={matchDefaultRegion}
                onCheckedChange={(checked) => setMatchDefaultRegion(checked === true)}
              />
              <Label htmlFor="markets-match-region" size="small">
                {t("store.matchDefaultRegion")}
              </Label>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-y-2">
          <Label htmlFor="markets-fallback" size="small" weight="plus">
            {t("store.fallbackMarket")}
          </Label>
          <Select size="small" value={fallback} onValueChange={setFallback}>
            <Select.Trigger id="markets-fallback" aria-describedby="markets-fallback-hint">
              <Select.Value placeholder={t("store.choose")} />
            </Select.Trigger>
            <Select.Content>
              {openMarkets.map((key) => (
                <Select.Item key={key} value={key}>
                  {marketName(key, countryNames, i18n.language)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Text
            id="markets-fallback-hint"
            size="small"
            leading="compact"
            className="text-ui-fg-subtle"
          >
            {t("store.fallbackMarketHint")}
          </Text>
        </div>

        {languagesInUse.map((code) => {
          const name = languageName(code, i18n.language);
          const choices = localesOfLanguage(overview.locales, code);
          const gone = localeIsGone(overview, code);
          return (
            <div key={code} className="flex flex-col gap-y-2">
              <Label htmlFor={`markets-html-lang-${code}`} size="small" weight="plus">
                {t("store.htmlLang", { language: name })}
              </Label>
              <Input
                id={`markets-html-lang-${code}`}
                size="small"
                value={htmlLang[code] ?? ""}
                placeholder={t("store.htmlLangDefault")}
                onChange={(event) => setHtmlLang({ ...htmlLang, [code]: event.target.value })}
                autoComplete="off"
                spellCheck={false}
              />
              {showsLocale(overview, code) && choices.length > 0 && (
                <>
                  <Label htmlFor={`markets-locale-${code}`} size="small" weight="plus">
                    {t("store.locale", { language: name })}
                  </Label>
                  <Select
                    size="small"
                    value={locale[code] ?? ""}
                    onValueChange={(value) => setLocale({ ...locale, [code]: value })}
                  >
                    <Select.Trigger id={`markets-locale-${code}`}>
                      <Select.Value placeholder={t("store.choose")} />
                    </Select.Trigger>
                    <Select.Content>
                      {choices.map((choice) => (
                        <Select.Item key={choice} value={choice}>
                          {choice}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                  <Text size="small" leading="compact" className="text-ui-fg-subtle">
                    {gone ? t("store.localeGoneHint") : t("store.localeHint")}
                  </Text>
                </>
              )}
            </div>
          );
        })}
        {languagesInUse.length > 0 && (
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {t("store.htmlLangHint")}
          </Text>
        )}
      </Drawer.Body>
      <Drawer.Footer>
        <Drawer.Close asChild>
          <Button size="small" variant="secondary" disabled={save.isPending}>
            {t("store.cancel")}
          </Button>
        </Drawer.Close>
        <Button
          size="small"
          onClick={submit}
          isLoading={save.isPending}
          disabled={Object.keys(body).length === 0}
        >
          {t("store.save")}
        </Button>
      </Drawer.Footer>
    </>
  );
};
