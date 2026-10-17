// Ours (T36, SETUP.md "Footers and site organisms (T36)"; D44, D45). CookieConsent's "choose" button
// and the dialog it opens: the three categories of SPEC §8.4 (necessary, analytics, marketing), each
// a row with its name, its description and a switch. A client component: Base UI's Dialog keeps the
// open state and moves focus, and the switches are state. It takes the words as they are in the
// catalog and formats none of them (a type import of the catalog's shape is all it needs of i18n),
// so it adds nothing to the island's chunk but itself.
// - Necessary is on and cannot change: a switch that is checked and disabled, with "Always on"
//   drawn beside it as text (not dimmed with the switch) and tied to it with `aria-describedby`, so
//   a screen reader hears "Necessary, switch, on, unavailable" and then that it is always on.
// - Analytics and marketing are off unless the visitor chose otherwise before (`defaultSwitches`): no
//   pre-ticked boxes (GDPR; the copy says so: "Nothing is switched on until you save"). Each is a
//   Switch named by its label (`aria-labelledby`) and described by its sentence (`aria-describedby`);
//   the label is around the switch and is its 44 px target (the Label atom's rule: the switch alone
//   is a 32 × 18 px track whose hit area is 42 px wide, and the design system's check reads a
//   switch's label with `closest("label")`; an `id` given to Switch lands on its hidden input, not
//   on the `role="switch"` element, so a `for` beside it would not be found). `aria-labelledby`
//   keeps the name the words alone, without "Always on".
// - Three buttons at the foot: "accept all" and "reject all" (the same look as the banner's, see
//   `ANSWER`) and "save", which sends the switches' state. Any of them closes the dialog first and
//   gives its answer once the dialog has left the page (`onOpenChangeComplete`, then an effect,
//   which runs after React has taken the popup out): the answer removes the banner, and the banner
//   asks for a control to move focus to (`focusAfter`), which must not be the dialog's own guards
//   or buttons, still in the page until then. Escape and the close button leave the answer alone
//   and Base UI puts focus back on "choose".
// - The popup is Base UI's dialog (`role="dialog"`, modal unless the DS draws it open with
//   `modal={false}`): focus goes to the first switch that can take it, Tab stays inside, and the
//   page behind is hidden from assistive technology. The close button is the primitive's, drawn at
//   the popup's corner and last in the tab order. A dialog drawn open at first render (`defaultOpen`,
//   the design system's states) takes no focus until a reader opens it again. The link to the
//   cookie policy is after the switches, a 44 px link of its own, so that focus starts on the first
//   switch and not on a link in the description.
"use client";

import type { Messages } from "@shopblok/i18n";
import type { ConsentChoice } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Label } from "@shopblok/ui/atoms/label";
import { Link } from "@shopblok/ui/atoms/link";
import { Switch } from "@shopblok/ui/atoms/switch";
import { cn } from "@shopblok/ui/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shopblok/ui/primitives/dialog";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import type * as React from "react";
import { acceptAll, ANSWER, capitalised, rejectAll } from "./cookie-consent-parts";

type CookieConsentDialogProps = {
  /** The wording, from the catalog's `organisms.cookieConsent`. */
  copy: Messages["organisms"]["cookieConsent"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The cookie policy the description links to. */
  policyHref: string;
  /** The policy link's `prefetch` (next/link). */
  prefetch?: boolean | null;
  /** Open at first render: for the design system's states, inside its overlay box. */
  defaultOpen?: boolean;
  /** `false` for the design system's states (D45); a shop leaves it unset, so the dialog is modal. */
  modal?: boolean;
  /** Where the switches start: off, unless the visitor chose otherwise before. */
  defaultSwitches?: ConsentChoice;
  /** The class of the popup: the design system's states cap it to their box. */
  popupClassName?: string;
  /** What the visitor chose, called once the dialog has gone from the page. */
  onAnswer: (choice: ConsentChoice) => void;
};

/**
 * For a dialog given `defaultOpen`: no focus when it opens by itself (the interaction type is
 * empty), the first control's when a reader opens it later. Several open states on one design-system
 * page would take it from each other, and a popup that is not modal closes when focus leaves it.
 */
const takesFocusWhenOpenedByAReader = (interaction: string) => interaction !== "";

// `Link` takes whatever `next/link` takes, which an app with typed routes narrows to its own
// routes. The policy's `href` is a string the app built, so the cast follows the app's type.
type LinkHref = React.ComponentProps<typeof Link>["href"];

type CategoryProps = {
  /** The switch's name and the label beside it. */
  name: string;
  description: string;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Necessary cookies: on, and not the visitor's to change. */
  fixed?: string;
  category: "necessary" | "analytics" | "marketing";
};

function Category({ name, description, checked, onCheckedChange, fixed, category }: CategoryProps) {
  const id = useId();
  const nameId = `${id}-name`;
  const descriptionId = `${id}-description`;
  const fixedId = `${id}-fixed`;
  return (
    <li
      data-slot="cookie-consent-category"
      data-category={category}
      className="flex min-w-0 flex-col gap-1 border-t border-border pt-3 first:border-t-0 first:pt-0"
    >
      {/* The label is around the switch, as the Label atom asks: the whole row is the switch's 44 px target. */}
      <Label
        data-slot="cookie-consent-category-label"
        className="min-h-11 w-full min-w-0 justify-between gap-4 text-base"
      >
        <span
          id={nameId}
          data-slot="cookie-consent-category-name"
          className="min-w-0 flex-1 wrap-anywhere"
        >
          {name}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {fixed === undefined ? null : (
            <span
              id={fixedId}
              data-slot="cookie-consent-always-on"
              className="text-sm font-medium text-muted-foreground"
            >
              {fixed}
            </span>
          )}
          <Switch
            data-slot="cookie-consent-switch"
            checked={checked}
            disabled={fixed !== undefined}
            onCheckedChange={onCheckedChange}
            aria-labelledby={nameId}
            aria-describedby={fixed === undefined ? descriptionId : `${descriptionId} ${fixedId}`}
          />
        </span>
      </Label>
      <p
        id={descriptionId}
        data-slot="cookie-consent-category-description"
        className="text-sm leading-snug wrap-break-word text-muted-foreground"
      >
        {description}
      </p>
    </li>
  );
}

function CookieConsentDialog({
  copy,
  locale,
  policyHref,
  prefetch,
  defaultOpen = false,
  modal,
  defaultSwitches,
  popupClassName,
  onAnswer,
}: CookieConsentDialogProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [switches, setSwitches] = useState<ConsentChoice>(() => defaultSwitches ?? rejectAll());
  // The answer waits here while the dialog closes, then in state until the popup is out of the page.
  const pending = useRef<ConsentChoice | null>(null);
  const [answered, setAnswered] = useState<ConsentChoice | null>(null);
  const answer = useEffectEvent(onAnswer);
  useEffect(() => {
    if (answered !== null) answer(answered);
  }, [answered]);

  function close(choice: ConsentChoice) {
    pending.current = choice;
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      modal={modal}
      onOpenChange={(next) => {
        // Opening again forgets an answer that never completed.
        if (next) pending.current = null;
        setOpen(next);
      }}
      onOpenChangeComplete={(isOpen) => {
        if (isOpen || pending.current === null) return;
        setAnswered(pending.current);
        pending.current = null;
      }}
    >
      <DialogTrigger
        data-slot="cookie-consent-choose"
        render={<Button variant="outline" className="w-full wrap-anywhere sm:w-auto" />}
      >
        {copy.choose}
      </DialogTrigger>
      <DialogContent
        data-slot="cookie-consent-dialog"
        closeLabel={copy.close}
        initialFocus={defaultOpen ? takesFocusWhenOpenedByAReader : undefined}
        className={cn("sm:max-w-lg", popupClassName)}
      >
        <DialogHeader>
          <DialogTitle className="wrap-break-word">{copy.dialogTitle}</DialogTitle>
          <DialogDescription className="wrap-break-word">
            {copy.dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <ul
          role="list"
          data-slot="cookie-consent-categories"
          className="flex min-w-0 flex-col gap-3"
        >
          <Category
            category="necessary"
            name={copy.necessary}
            description={copy.necessaryDescription}
            checked
            fixed={copy.alwaysOn}
          />
          <Category
            category="analytics"
            name={copy.analytics}
            description={copy.analyticsDescription}
            checked={switches.analytics}
            onCheckedChange={(analytics) => setSwitches((now) => ({ ...now, analytics }))}
          />
          <Category
            category="marketing"
            name={copy.marketing}
            description={copy.marketingDescription}
            checked={switches.marketing}
            onCheckedChange={(marketing) => setSwitches((now) => ({ ...now, marketing }))}
          />
        </ul>
        {/* After the switches, so that focus starts on the first of them and not on a link. */}
        <Link
          variant="standalone"
          href={policyHref as LinkHref}
          prefetch={prefetch}
          data-slot="cookie-consent-policy"
          className="w-fit max-w-full wrap-anywhere"
        >
          {capitalised(copy.policyLink, locale)}
        </Link>
        <DialogFooter className="flex-col sm:flex-row sm:flex-wrap sm:justify-start">
          <Button
            {...ANSWER}
            data-slot="cookie-consent-dialog-accept"
            className="w-full wrap-anywhere sm:w-auto"
            onClick={() => close(acceptAll())}
          >
            {copy.acceptAll}
          </Button>
          <Button
            {...ANSWER}
            data-slot="cookie-consent-dialog-reject"
            className="w-full wrap-anywhere sm:w-auto"
            onClick={() => close(rejectAll())}
          >
            {copy.rejectAll}
          </Button>
          <Button
            variant="outline"
            data-slot="cookie-consent-dialog-save"
            className="w-full wrap-anywhere sm:w-auto"
            onClick={() => close({ ...switches })}
          >
            {copy.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { CookieConsentDialog };
export type { CookieConsentDialogProps };
