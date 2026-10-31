import { ArrowDownMini, ArrowUpMini, XMarkMini } from "@medusajs/icons";
import {
  Badge,
  Button,
  Drawer,
  IconButton,
  Input,
  Label,
  Select,
  Switch,
  Text,
  toast,
} from "@medusajs/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSaveCountry } from "../lib/api";
import { languageName, storeLanguages, timeZoneOptions } from "../lib/format";
import { failureOf } from "../lib/refusal";
import type { OverviewCountry } from "../lib/types";
import { DrawerHeading, SaveFailure } from "./panel";

/** `Select.Item` cannot have an empty value, so "no time zone" is this one. */
const NO_ZONE = "__none__";

/**
 * The drawer that edits one country's market (D93; Medusa's pattern for editing: a Drawer). The
 * country itself is Medusa's, so nothing here adds or removes one. The form is its own component so
 * that it starts again from the saved values each time the drawer opens.
 */
export const CountryDrawer = ({
  country,
  locales,
  open,
  onOpenChange,
}: {
  country: OverviewCountry;
  locales: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => (
  <Drawer open={open} onOpenChange={onOpenChange}>
    <Drawer.Content>
      <CountryForm country={country} locales={locales} onClose={() => onOpenChange(false)} />
    </Drawer.Content>
  </Drawer>
);

const CountryForm = ({
  country,
  locales,
  onClose,
}: {
  country: OverviewCountry;
  locales: string[];
  onClose: () => void;
}) => {
  const { t, i18n } = useTranslation("markets");
  const save = useSaveCountry(country.code);
  const [enabled, setEnabled] = useState(country.enabled);
  const [languages, setLanguages] = useState(country.languages);
  const [timeZone, setTimeZone] = useState(country.time_zone ?? "");
  const [domain, setDomain] = useState(country.domain ?? "");
  // The control to focus once a move has re-ordered the list (a moved node loses the focus).
  const [refocus, setRefocus] = useState<string | null>(null);
  useEffect(() => {
    if (refocus === null) return;
    document.getElementById(refocus)?.focus();
    setRefocus(null);
  }, [refocus]);

  const nameOf = (code: string) => languageName(code, i18n.language);
  const addable = storeLanguages(locales).filter((code) => !languages.includes(code));
  const zones = timeZoneOptions(country.time_zone);
  const failure = save.isError ? failureOf(save.error) : null;

  const move = (index: number, step: -1 | 1) => {
    const target = index + step;
    const code = languages[index]!;
    if (target < 0 || target >= languages.length) return;
    const next = [...languages];
    next[index] = languages[target]!;
    next[target] = code;
    setLanguages(next);
    // Keep the focus on the moved language's control that still works (the one at the end is off).
    const canGoUp = target > 0;
    const canGoDown = target < languages.length - 1;
    const direction = step === -1 ? (canGoUp ? "up" : "down") : canGoDown ? "down" : "up";
    setRefocus(`markets-${direction}-${code}`);
  };

  const submit = () =>
    save.mutate(
      {
        enabled,
        languages,
        time_zone: timeZone === "" ? null : timeZone,
        domain: domain.trim() === "" ? null : domain.trim(),
      },
      {
        onSuccess: () => {
          toast.success(t("drawer.saved", { country: country.name }));
          onClose();
        },
      },
    );

  return (
    <>
      <DrawerHeading
        title={t("drawer.title", { country: country.name })}
        description={t("drawer.description", {
          country: country.name,
          region: country.region.name,
        })}
      />
      <Drawer.Body className="flex flex-1 flex-col gap-y-6 overflow-y-auto">
        {failure !== null && (
          <SaveFailure
            title={t("drawer.refused")}
            reasons={failure.reasons}
            message={t("drawer.failed", { message: failure.message })}
          />
        )}

        <div className="flex items-start justify-between gap-x-4">
          <div className="flex flex-col gap-y-1">
            <Label htmlFor="markets-open" size="small" weight="plus">
              {t("drawer.open")}
            </Label>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {t("drawer.openHint")}
            </Text>
          </div>
          <Switch id="markets-open" checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <fieldset className="flex flex-col gap-y-2">
          <legend className="mb-1">
            <Text as="span" size="small" leading="compact" weight="plus">
              {t("drawer.languages")}
            </Text>
          </legend>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {t("drawer.languagesHint")}
          </Text>
          {languages.length === 0 ? (
            <Text size="small" leading="compact" className="text-ui-fg-muted">
              {t("drawer.noLanguage")}
            </Text>
          ) : (
            <ol className="flex flex-col gap-y-2">
              {languages.map((code, index) => (
                <li
                  key={code}
                  className="bg-ui-bg-component shadow-borders-base flex items-center justify-between gap-x-2 rounded-md px-3 py-2"
                >
                  <div className="flex items-center gap-x-2">
                    <Text size="small" leading="compact" weight="plus">
                      {nameOf(code)}
                    </Text>
                    <Text size="small" leading="compact" className="text-ui-fg-subtle">
                      {code}
                    </Text>
                    {index === 0 && (
                      <Badge size="2xsmall" color="blue">
                        {t("drawer.defaultBadge")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-x-1">
                    <IconButton
                      id={`markets-up-${code}`}
                      size="small"
                      variant="transparent"
                      type="button"
                      aria-label={t("drawer.moveUp", {
                        language: nameOf(code),
                      })}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUpMini />
                    </IconButton>
                    <IconButton
                      id={`markets-down-${code}`}
                      size="small"
                      variant="transparent"
                      type="button"
                      aria-label={t("drawer.moveDown", {
                        language: nameOf(code),
                      })}
                      disabled={index === languages.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDownMini />
                    </IconButton>
                    <IconButton
                      size="small"
                      variant="transparent"
                      type="button"
                      aria-label={t("drawer.remove", {
                        language: nameOf(code),
                      })}
                      onClick={() => setLanguages(languages.filter((each) => each !== code))}
                    >
                      <XMarkMini />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {addable.length > 0 && (
            <Select
              size="small"
              value=""
              onValueChange={(code) => setLanguages([...languages, code])}
            >
              <Select.Trigger aria-label={t("drawer.addLanguage")}>
                <Select.Value placeholder={t("drawer.addLanguagePlaceholder")} />
              </Select.Trigger>
              <Select.Content>
                {addable.map((code) => (
                  <Select.Item key={code} value={code}>
                    {nameOf(code)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          )}
        </fieldset>

        <div className="flex flex-col gap-y-2">
          <Label htmlFor="markets-time-zone" size="small" weight="plus">
            {t("drawer.timeZone")}
          </Label>
          <Select
            size="small"
            value={timeZone === "" ? NO_ZONE : timeZone}
            onValueChange={(zone) => setTimeZone(zone === NO_ZONE ? "" : zone)}
          >
            <Select.Trigger id="markets-time-zone">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={NO_ZONE}>{t("drawer.timeZoneNone")}</Select.Item>
              {zones.map((zone) => (
                <Select.Item key={zone} value={zone}>
                  {zone}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        <div className="flex flex-col gap-y-2">
          <Label htmlFor="markets-domain" size="small" weight="plus">
            {t("drawer.domain")}
          </Label>
          <Input
            id="markets-domain"
            size="small"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            aria-describedby="markets-domain-hint"
            autoComplete="off"
            spellCheck={false}
          />
          <Text
            id="markets-domain-hint"
            size="small"
            leading="compact"
            className="text-ui-fg-subtle"
          >
            {t("drawer.domainHint")}
          </Text>
        </div>
      </Drawer.Body>
      <Drawer.Footer>
        <Drawer.Close asChild>
          <Button size="small" variant="secondary" disabled={save.isPending}>
            {t("drawer.cancel")}
          </Button>
        </Drawer.Close>
        <Button size="small" onClick={submit} isLoading={save.isPending}>
          {t("drawer.save")}
        </Button>
      </Drawer.Footer>
    </>
  );
};
