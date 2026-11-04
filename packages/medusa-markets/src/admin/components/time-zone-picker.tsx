import { CheckMini } from "@medusajs/icons";
import { Input, Text, clx } from "@medusajs/ui";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import { countryTimeZones, filterTimeZones, timeZoneOptions } from "../lib/format";

type Option = { value: string; label: string; index: number };

/**
 * The time zone of a market (W6 item 6): a combobox to type into, since the IANA list has about
 * 400 zones. The country's own zones come first (`Europe/Vienna` for Austria), then every other
 * zone; typing filters both (`vienna`, `new york`). `""` is "not set", offered while nothing is
 * typed. @medusajs/ui 4.2.6 has no combobox, so this is the WAI-ARIA one ("list autocomplete"):
 * the focus stays in the input, the arrow keys move the active option, Enter picks it, Escape
 * closes the list and only the list, so the drawer around it stays open (the window listener below).
 */
export const TimeZonePicker = ({
  id,
  value,
  onChange,
  country,
  countryName,
  describedBy,
}: {
  id: string;
  /** The zone, or `""` for none. */
  value: string;
  onChange: (zone: string) => void;
  /** The country's code, whose zones come first. */
  country: string;
  countryName: string;
  describedBy?: string;
}) => {
  const { t } = useTranslation("markets");
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const own = useMemo(() => countryTimeZones(country), [country]);
  const all = useMemo(() => timeZoneOptions(value === "" ? null : value), [value]);
  const rest = useMemo(() => all.filter((zone) => !own.includes(zone)), [all, own]);

  // The options as the list shows them, numbered in that order for the arrow keys.
  const { none, ownOptions, restOptions, options } = useMemo(() => {
    let index = 0;
    const make = (zone: string): Option => ({ value: zone, label: zone, index: index++ });
    const noneOption =
      query.trim() === "" ? { value: "", label: t("drawer.timeZoneNone"), index: index++ } : null;
    const mine = filterTimeZones(own, query).map(make);
    const others = filterTimeZones(rest, query).map(make);
    return {
      none: noneOption,
      ownOptions: mine,
      restOptions: others,
      options: [...(noneOption ? [noneOption] : []), ...mine, ...others],
    };
  }, [own, rest, query, t]);

  const expanded = open && options.length > 0;
  const optionId = (index: number) => `${listId}-option-${index}`;

  // Keep the active option in sight as the arrow keys move it.
  useEffect(() => {
    if (!expanded) return;
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, expanded]);

  const show = () => {
    setOpen(true);
    setQuery("");
    // Start at the chosen zone, as a select does: 0 is "not set", then the list's order.
    setActive(value === "" ? 0 : [...own, ...rest].indexOf(value) + 1);
  };

  const hide = () => {
    setOpen(false);
    setQuery("");
  };

  const pick = (zone: string) => {
    onChange(zone);
    hide();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) show();
        else setActive((index) => Math.min(index + 1, options.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        if (open) setActive((index) => Math.max(index - 1, 0));
        break;
      case "Enter": {
        const option = options[active];
        if (expanded && option !== undefined) {
          event.preventDefault();
          pick(option.value);
        }
        break;
      }
      case "Tab":
        if (open) hide();
        break;
    }
  };

  const renderOption = (option: Option) => {
    const selected = option.value === value;
    return (
      <div
        key={option.value === "" ? "__none__" : option.value}
        id={optionId(option.index)}
        role="option"
        aria-selected={selected}
        data-index={option.index}
        className={clx(
          "txt-compact-small text-ui-fg-base flex cursor-pointer items-center gap-x-2 rounded-md py-1.5 pl-2 pr-2",
          option.index === active && "bg-ui-bg-component-hover",
        )}
        // Keep the focus in the input, so a click picks without a blur closing the list first.
        onMouseDown={(event) => event.preventDefault()}
        onMouseMove={() => setActive(option.index)}
        onClick={() => pick(option.value)}
      >
        <span className="flex size-[15px] shrink-0 items-center justify-center">
          {selected && <CheckMini aria-hidden />}
        </span>
        <span className={clx(option.value === "" && "text-ui-fg-subtle")}>{option.label}</span>
      </div>
    );
  };

  const group = (key: string, label: string, items: Option[]) =>
    items.length === 0 ? null : (
      <div role="group" aria-labelledby={`${listId}-${key}`}>
        <div
          id={`${listId}-${key}`}
          role="presentation"
          className="txt-compact-xsmall-plus text-ui-fg-subtle px-2 pb-1 pt-2"
        >
          {label}
        </div>
        {items.map(renderOption)}
      </div>
    );

  // Escape while the list is open closes the list, not a dialog around the picker. A Radix dialog
  // (the drawer) listens for Escape on the document in the capture phase, before the input's own
  // handler runs, so the picker listens on the window, one step earlier, and keeps the key there.
  useEffect(() => {
    if (!open) return;
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.target !== inputRef.current) return;
      event.stopPropagation();
      event.preventDefault();
      hide();
    };
    window.addEventListener("keydown", onEscape, { capture: true });
    return () => window.removeEventListener("keydown", onEscape, { capture: true });
  }, [open]);

  // The dashboard's i18next does not escape (`escapeValue: false`), and React escapes the text.
  const status = !open
    ? ""
    : options.length === 0
      ? t("drawer.timeZoneNoMatch", { query: query.trim() })
      : t("drawer.timeZoneMatches", { count: ownOptions.length + restOptions.length });

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        size="small"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded ? optionId(active) : undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        spellCheck={false}
        value={open ? query : value}
        placeholder={open ? value || t("drawer.timeZoneNone") : t("drawer.timeZoneNone")}
        onClick={() => {
          if (!open) show();
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        onBlur={hide}
      />
      {expanded && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={t("drawer.timeZone")}
          className="bg-ui-bg-component shadow-elevation-flyout absolute inset-x-0 top-full z-50 mt-1 max-h-[280px] overflow-y-auto rounded-lg p-1"
          // A press on the list's scrollbar must not blur the input either.
          onMouseDown={(event) => event.preventDefault()}
        >
          {none !== null && renderOption(none)}
          {group("own", t("drawer.timeZoneOwn", { country: countryName }), ownOptions)}
          {group("all", t("drawer.timeZoneAll"), restOptions)}
        </div>
      )}
      {open && options.length === 0 && (
        <Text size="small" leading="compact" className="text-ui-fg-subtle mt-1" aria-hidden>
          {status}
        </Text>
      )}
      <span className="sr-only" aria-live="polite">
        {status}
      </span>
    </div>
  );
};
