import { Button, Drawer, Input, Label, Select, Text, toast } from "@medusajs/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useSaveSettings } from "../lib/api";
import { languageName, localesOfLanguage, marketName } from "../lib/format";
import { failureOf } from "../lib/refusal";
import type { MarketsOverview, SettingsBody } from "../lib/types";
import { DrawerHeading, SaveFailure } from "./panel";

/**
 * The drawer of the Store page's panel (D93): the primary country and the fallback market, chosen
 * from what is open, the `<html lang>` override of each language in use, and, only for a language
 * that has two or more store locales, which locale it uses. It adds or removes no locale: the
 * store's locales are Medusa's own, in the Locales section of the page.
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
    Object.fromEntries(
      languagesInUse.map((code) => [
        code,
        rowOf(code)?.medusa_locale ?? localesOfLanguage(overview.locales, code)[0] ?? "",
      ]),
    ),
  );

  const body: SettingsBody = {
    ...(primary !== "" ? { primary_country: primary } : {}),
    ...(fallback !== "" ? { fallback_market: fallback } : {}),
    languages: languagesInUse
      .filter((code) => locale[code] !== "")
      .map((code) => ({
        code,
        medusa_locale: locale[code]!,
        html_lang: htmlLang[code]!.trim() === "" ? null : htmlLang[code]!.trim(),
      })),
  };
  if (body.languages!.length === 0) delete body.languages;

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
              {choices.length >= 2 && (
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
                    {t("store.localeHint")}
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
