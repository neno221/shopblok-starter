import { catalogs } from "@shopblok/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@shopblok/ui/atoms/avatar";
import { Badge } from "@shopblok/ui/atoms/badge";
import { Button } from "@shopblok/ui/atoms/button";
import { Checkbox } from "@shopblok/ui/atoms/checkbox";
import { Input } from "@shopblok/ui/atoms/input";
import { Kbd, KbdGroup } from "@shopblok/ui/atoms/kbd";
import { Label } from "@shopblok/ui/atoms/label";
import { NativeSelect, NativeSelectOption } from "@shopblok/ui/atoms/native-select";
import { Progress, ProgressLabel, ProgressValue } from "@shopblok/ui/atoms/progress";
import { RadioGroup, RadioGroupItem } from "@shopblok/ui/atoms/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shopblok/ui/atoms/select";
import { Separator } from "@shopblok/ui/atoms/separator";
import { Skeleton } from "@shopblok/ui/atoms/skeleton";
import { Spinner } from "@shopblok/ui/atoms/spinner";
import { Switch } from "@shopblok/ui/atoms/switch";
import { Textarea } from "@shopblok/ui/atoms/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shopblok/ui/atoms/tooltip";
import { HeartIcon } from "lucide-react";
import type { DesignSystemStrings } from "@shopblok/fixtures";
import type { EntryId } from "@shopblok/registry";
import type { ReactNode } from "react";
import type { DsContext, DsState, DsStory } from "../types";

// The stories of the 17 shadcn atoms (T21; SETUP.md, "How to add an entry"): their ids, labels and
// order are the registry's. Every sample string comes from `ctx.fixture`, the atoms' own copy from
// `catalogs`.
// A page renders the live render and every state, so each control's id carries the part it is in
// (`live`, or the state's id) and stays unique on the page.
//
// Hover and keyboard focus cannot be held still on a static page, so their states draw the classes
// the atom adds on `:hover` and `:focus-visible`; the description says so.

/** The classes `focus-visible:` adds, for the focus states. */
export const FOCUS = "border-ring ring-3 ring-ring";

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    // `minmax(0, 1fr)`: an auto track would grow to a Select's one-line value and overflow.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

/** A Checkbox, Radio or Switch in its label: the label is the 44 px target (D32). */
function Choice({ control, label }: { control: ReactNode; label: string }) {
  return (
    <Label className="min-h-11 py-2 font-normal">
      {control}
      <span>{label}</span>
    </Label>
  );
}

const initials = (name: string) =>
  name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join("");

/**
 * The usual states of a form field, then the long label. The focus states pass the focus classes
 * as `className`, so `render` puts it on the control itself (NativeSelect's `selectClassName`).
 * "Invalid and focused" shows the full-strength ring over the destructive border (D35).
 */
function fieldStates(
  slug: string,
  render: (props: {
    id: string;
    strings: DesignSystemStrings;
    className?: string;
    disabled?: boolean;
    invalid?: boolean;
  }) => ReactNode,
): DsState[] {
  const state = (
    id: string,
    label: string,
    description: string | undefined,
    options: { long?: boolean; className?: string; disabled?: boolean; invalid?: boolean } = {},
  ): DsState => ({
    id,
    label,
    description,
    render: (ctx) => {
      const strings = options.long ? ctx.fixture.long : ctx.fixture.ordinary;
      return render({ id: `${slug}-${id}`, strings, ...options });
    },
  });
  return [
    state("default", "Default", undefined),
    state("focus", "Focus", "The ring `:focus-visible` draws, at full strength (D35).", {
      className: FOCUS,
    }),
    state("disabled", "Disabled", undefined, { disabled: true }),
    state("invalid", "Invalid", "aria-invalid, with the error message as its description.", {
      invalid: true,
    }),
    state(
      "invalid-focus",
      "Invalid and focused",
      "The full-strength ring over the destructive border: where focus lands after a failed submit.",
      { invalid: true, className: FOCUS },
    ),
    state("long-label", "Long label", "The locale's longest strings.", { long: true }),
  ];
}

/** The error message under an invalid field, tied to it with aria-describedby. */
function ErrorText({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-destructive text-sm">
      {children}
    </p>
  );
}

const sizeItems = (ctx: DsContext) =>
  ctx.fixture.sizes.map((size) => ({ label: size.label, value: size.label }));

/** The fixture's sizes in stock, and the first one that is not. */
const radioSizes = (ctx: DsContext) => ({
  available: ctx.fixture.sizes.filter((size) => size.available),
  soldOut: ctx.fixture.sizes.find((size) => !size.available),
});

/** Two sizes in stock; `className` goes on the first radio. */
function radioPair(
  ctx: DsContext,
  { chosen, invalid, className }: { chosen?: boolean; invalid?: boolean; className?: string },
) {
  const [first, second] = radioSizes(ctx).available;
  return (
    <RadioGroup
      aria-label={ctx.fixture.ordinary.fieldLabel}
      defaultValue={chosen ? first?.label : undefined}
    >
      {[first, second].map(
        (size, index) =>
          size && (
            <Choice
              key={size.label}
              control={
                <RadioGroupItem
                  value={size.label}
                  aria-invalid={invalid ? "true" : undefined}
                  className={index === 0 ? className : undefined}
                />
              }
              label={size.label}
            />
          ),
      )}
    </RadioGroup>
  );
}

export const atomStories = {
  "atoms/button": {
    summary:
      "An action. Six variants, at least 44 px tall, with an icon size for icon-only buttons.",
    a11y: [
      "A native button: Enter and Space press it, Tab reaches it.",
      "At least 44 × 44 px in every size (D32); long labels wrap instead of being cut.",
      "An icon-only button needs an accessible name (aria-label); the icon is aria-hidden.",
      "The focus ring is the ring token at full strength, 3:1 on the background (D35).",
    ],
    live: (ctx) => (
      <div className="flex flex-wrap gap-3">
        <Button>{ctx.fixture.ordinary.action}</Button>
        <Button variant="outline">{ctx.fixture.ordinary.action}</Button>
        <Button variant="secondary">{ctx.fixture.ordinary.action}</Button>
        <Button variant="ghost">{ctx.fixture.ordinary.action}</Button>
        <Button variant="destructive">{ctx.fixture.ordinary.action}</Button>
        <Button variant="link">{ctx.fixture.ordinary.action}</Button>
        <Button size="icon" aria-label={ctx.fixture.ordinary.hint}>
          <HeartIcon aria-hidden="true" />
        </Button>
      </div>
    ),
    states: [
      {
        id: "default",
        label: "Default",
        render: (ctx) => <Button>{ctx.fixture.ordinary.action}</Button>,
      },
      {
        id: "hover",
        label: "Hover",
        description: "The fill `:hover` gives the default variant.",
        render: (ctx) => <Button className="bg-primary/80">{ctx.fixture.ordinary.action}</Button>,
      },
      {
        id: "focus",
        label: "Focus",
        description: "The ring `:focus-visible` draws, at full strength (D35).",
        render: (ctx) => <Button className={FOCUS}>{ctx.fixture.ordinary.action}</Button>,
      },
      {
        id: "destructive-focus",
        label: "Destructive, focused",
        description: "The destructive variant keeps the same full-strength ring (D35).",
        render: (ctx) => (
          <Button variant="destructive" className={FOCUS}>
            {ctx.fixture.ordinary.action}
          </Button>
        ),
      },
      {
        id: "disabled",
        label: "Disabled",
        render: (ctx) => <Button disabled>{ctx.fixture.ordinary.action}</Button>,
      },
      {
        id: "large",
        label: "Large",
        render: (ctx) => <Button size="lg">{ctx.fixture.ordinary.action}</Button>,
      },
      {
        id: "long-label",
        label: "Long label",
        description: "Wraps; the button grows taller.",
        render: (ctx) => <Button>{ctx.fixture.long.action}</Button>,
      },
    ],
  },
  "atoms/input": {
    summary: "A single-line text field, 44 px tall.",
    a11y: [
      "Every field has a visible label tied to it (for/id); the placeholder is a hint, never the label.",
      "An invalid field has aria-invalid and its message tied with aria-describedby.",
      "The field's edge is the input token, 3:1 on the background (D35).",
    ],
    live: (ctx) => (
      <Field id="input-live" label={ctx.fixture.ordinary.fieldLabel}>
        <Input id="input-live" placeholder={ctx.fixture.ordinary.placeholder} />
      </Field>
    ),
    states: fieldStates("input", ({ id, strings, className, disabled, invalid }) => (
      <Field id={id} label={strings.fieldLabel}>
        <Input
          id={id}
          placeholder={strings.placeholder}
          className={className}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
        />
        {invalid && <ErrorText id={`${id}-error`}>{strings.errorText}</ErrorText>}
      </Field>
    )),
  },
  "atoms/textarea": {
    summary: "A multi-line text field that grows with its content.",
    a11y: [
      "A visible label tied to it; Enter adds a line, Tab leaves it.",
      "An invalid field has aria-invalid and its message tied with aria-describedby.",
    ],
    live: (ctx) => (
      <Field id="textarea-live" label={ctx.fixture.ordinary.fieldLabel}>
        <Textarea id="textarea-live" placeholder={ctx.fixture.ordinary.placeholder} />
      </Field>
    ),
    states: fieldStates("textarea", ({ id, strings, className, disabled, invalid }) => (
      <Field id={id} label={strings.fieldLabel}>
        <Textarea
          id={id}
          placeholder={strings.placeholder}
          className={className}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
        />
        {invalid && <ErrorText id={`${id}-error`}>{strings.errorText}</ErrorText>}
      </Field>
    )),
  },
  "atoms/select": {
    summary:
      "A styled list box (Base UI), for choices that need more than a native select can draw.",
    a11y: [
      "The trigger is a combobox named by its label; Enter, Space or the arrow keys open it.",
      "In the list the arrow keys move, Enter picks, Escape closes and focus returns to the trigger.",
      "The trigger and each option are at least 44 px tall (D32). The chosen value is cut to one line and says so (data-truncate); the options wrap.",
    ],
    live: (ctx) => (
      <Field id="select-live" label={ctx.fixture.ordinary.fieldLabel}>
        <Select items={sizeItems(ctx)}>
          <SelectTrigger id="select-live" className="w-full max-w-xs">
            <SelectValue placeholder={ctx.fixture.ordinary.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {ctx.fixture.sizes.map((size) => (
              <SelectItem key={size.label} value={size.label} disabled={!size.available}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    ),
    states: fieldStates("select", ({ id, strings, className, disabled, invalid }) => (
      <Field id={id} label={strings.fieldLabel}>
        <Select items={[{ label: strings.placeholder, value: "a" }]} disabled={disabled}>
          <SelectTrigger
            id={id}
            className={["w-full", className].join(" ")}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? `${id}-error` : undefined}
          >
            <SelectValue placeholder={strings.placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">{strings.placeholder}</SelectItem>
          </SelectContent>
        </Select>
        {invalid && <ErrorText id={`${id}-error`}>{strings.errorText}</ErrorText>}
      </Field>
    )),
  },
  "atoms/native-select": {
    summary: "The browser's own select, styled: the platform's picker on phones.",
    a11y: [
      "A native select: every platform's keyboard and screen-reader behaviour comes with it.",
      "44 px tall (D32). The browser cuts a long chosen option to the box, so it says so (data-truncate).",
    ],
    live: (ctx) => (
      <Field id="native-select-live" label={ctx.fixture.ordinary.fieldLabel}>
        <NativeSelect id="native-select-live" defaultValue="">
          <NativeSelectOption value="" disabled>
            {ctx.fixture.ordinary.placeholder}
          </NativeSelectOption>
          {ctx.fixture.sizes.map((size) => (
            <NativeSelectOption key={size.label} value={size.label} disabled={!size.available}>
              {size.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
    ),
    states: fieldStates("native-select", ({ id, strings, className, disabled, invalid }) => (
      <Field id={id} label={strings.fieldLabel}>
        <NativeSelect
          id={id}
          className="w-full"
          selectClassName={className}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
        >
          <NativeSelectOption value="a">{strings.placeholder}</NativeSelectOption>
        </NativeSelect>
        {invalid && <ErrorText id={`${id}-error`}>{strings.errorText}</ErrorText>}
      </Field>
    )),
  },
  "atoms/checkbox": {
    summary: "An on/off choice in a form, in its label.",
    a11y: [
      "Space toggles it; Enter does not (it would submit the form).",
      "The box keeps the kit's 16 px; its label, at least 44 px tall, is the target, and the box's own hit area is 44 × 44 (D32).",
      "Checked is shown by the tick, not by colour alone (WCAG 1.4.1).",
    ],
    live: (ctx) => (
      <Choice control={<Checkbox defaultChecked />} label={ctx.fixture.ordinary.optionLabel} />
    ),
    states: [
      {
        id: "unchecked",
        label: "Unchecked",
        render: (ctx) => <Choice control={<Checkbox />} label={ctx.fixture.ordinary.optionLabel} />,
      },
      {
        id: "checked",
        label: "Checked",
        render: (ctx) => (
          <Choice control={<Checkbox defaultChecked />} label={ctx.fixture.ordinary.optionLabel} />
        ),
      },
      {
        id: "focus",
        label: "Focus",
        description: "The ring `:focus-visible` draws, at full strength (D35).",
        render: (ctx) => (
          <Choice
            control={<Checkbox className={FOCUS} />}
            label={ctx.fixture.ordinary.optionLabel}
          />
        ),
      },
      {
        id: "disabled",
        label: "Disabled",
        render: (ctx) => (
          <Choice control={<Checkbox disabled />} label={ctx.fixture.ordinary.optionLabel} />
        ),
      },
      {
        id: "invalid",
        label: "Invalid",
        description: "aria-invalid: a required box left empty.",
        render: (ctx) => (
          <Choice
            control={<Checkbox aria-invalid="true" />}
            label={ctx.fixture.ordinary.optionLabel}
          />
        ),
      },
      {
        id: "invalid-focus",
        label: "Invalid and focused",
        description: "The full-strength ring over the destructive border (D35).",
        render: (ctx) => (
          <Choice
            control={<Checkbox aria-invalid="true" className={FOCUS} />}
            label={ctx.fixture.ordinary.optionLabel}
          />
        ),
      },
      {
        id: "long-label",
        label: "Long label",
        description: "The label wraps beside the box.",
        render: (ctx) => <Choice control={<Checkbox />} label={ctx.fixture.long.optionLabel} />,
      },
    ],
  },
  "atoms/radio-group": {
    summary: "One choice of several, each in its label.",
    a11y: [
      "Tab enters the group at the chosen radio; the arrow keys move and choose; Tab leaves.",
      "The group has a name (aria-label or a legend); each radio is named by its label.",
      "Each label is at least 44 px tall, and each circle's hit area is 44 × 44 (D32).",
    ],
    live: (ctx) => (
      <RadioGroup
        aria-label={ctx.fixture.ordinary.fieldLabel}
        defaultValue={radioSizes(ctx).available[1]?.label}
      >
        {ctx.fixture.sizes.map((size) => (
          <Choice
            key={size.label}
            control={<RadioGroupItem value={size.label} disabled={!size.available} />}
            label={size.label}
          />
        ))}
      </RadioGroup>
    ),
    states: [
      {
        id: "default",
        label: "Default",
        description: "One chosen, one disabled (the first size out of stock).",
        render: (ctx) => {
          const { available, soldOut } = radioSizes(ctx);
          return (
            <RadioGroup
              aria-label={ctx.fixture.ordinary.fieldLabel}
              defaultValue={available[0]?.label}
            >
              {available.slice(0, 3).map((size) => (
                <Choice
                  key={size.label}
                  control={<RadioGroupItem value={size.label} />}
                  label={size.label}
                />
              ))}
              {soldOut && (
                <Choice
                  control={<RadioGroupItem value={soldOut.label} disabled />}
                  label={soldOut.label}
                />
              )}
            </RadioGroup>
          );
        },
      },
      {
        id: "focus",
        label: "Focus",
        description: "The ring `:focus-visible` draws, at full strength (D35).",
        render: (ctx) => radioPair(ctx, { chosen: true, className: FOCUS }),
      },
      {
        id: "invalid",
        label: "Invalid",
        description: "aria-invalid on each radio: nothing chosen in a required group.",
        render: (ctx) => radioPair(ctx, { invalid: true }),
      },
      {
        id: "invalid-focus",
        label: "Invalid and focused",
        description: "The full-strength ring over the destructive border (D35).",
        render: (ctx) => radioPair(ctx, { invalid: true, className: FOCUS }),
      },
      {
        id: "long-label",
        label: "Long label",
        render: (ctx) => {
          const { optionLabel, toggleLabel } = ctx.fixture.long;
          return (
            <RadioGroup aria-label={ctx.fixture.long.fieldLabel} defaultValue={optionLabel}>
              <Choice control={<RadioGroupItem value={optionLabel} />} label={optionLabel} />
              <Choice control={<RadioGroupItem value={toggleLabel} />} label={toggleLabel} />
            </RadioGroup>
          );
        },
      },
    ],
  },
  "atoms/switch": {
    summary: "A setting that takes effect at once, in its label.",
    a11y: [
      "role=switch: Space toggles it, and the change applies without a submit.",
      "The track keeps the kit's size; its label, at least 44 px tall, is the target, and the track's own hit area is 44 px (D32).",
      "On and off differ by the thumb's position as well as the colour (WCAG 1.4.1).",
    ],
    live: (ctx) => (
      <Choice control={<Switch defaultChecked />} label={ctx.fixture.ordinary.toggleLabel} />
    ),
    states: [
      {
        id: "off",
        label: "Off",
        render: (ctx) => <Choice control={<Switch />} label={ctx.fixture.ordinary.toggleLabel} />,
      },
      {
        id: "on",
        label: "On",
        render: (ctx) => (
          <Choice control={<Switch defaultChecked />} label={ctx.fixture.ordinary.toggleLabel} />
        ),
      },
      {
        id: "focus",
        label: "Focus",
        description: "The ring `:focus-visible` draws, at full strength (D35).",
        render: (ctx) => (
          <Choice control={<Switch className={FOCUS} />} label={ctx.fixture.ordinary.toggleLabel} />
        ),
      },
      {
        id: "disabled",
        label: "Disabled",
        render: (ctx) => (
          <Choice control={<Switch disabled />} label={ctx.fixture.ordinary.toggleLabel} />
        ),
      },
      {
        id: "long-label",
        label: "Long label",
        render: (ctx) => <Choice control={<Switch />} label={ctx.fixture.long.toggleLabel} />,
      },
    ],
  },
  "atoms/label": {
    summary: "A form field's name, tied to its control.",
    a11y: [
      "Tied with for/id, or wrapping the control; clicking it focuses or toggles the control.",
      "Dims with a disabled control. Long labels wrap with room between the lines.",
    ],
    live: (ctx) => (
      <Field id="label-live" label={ctx.fixture.ordinary.fieldLabel}>
        <Input id="label-live" />
      </Field>
    ),
    states: [
      {
        id: "default",
        label: "Default",
        render: (ctx) => (
          <Field id="label-default" label={ctx.fixture.ordinary.fieldLabel}>
            <Input id="label-default" />
          </Field>
        ),
      },
      {
        id: "long-label",
        label: "Long label",
        render: (ctx) => (
          <Field id="label-long" label={ctx.fixture.long.fieldLabel}>
            <Input id="label-long" />
          </Field>
        ),
      },
    ],
  },
  "atoms/badge": {
    summary: "A short status or tag. Not a control, unless rendered as a link.",
    a11y: [
      "Text, so it is read as it is; a badge never carries meaning by its colour alone (WCAG 1.4.1).",
      "Long text wraps instead of being cut.",
    ],
    live: (ctx) => (
      <div className="flex flex-wrap gap-2">
        <Badge>{ctx.fixture.ordinary.badge}</Badge>
        <Badge variant="secondary">{ctx.fixture.ordinary.badge}</Badge>
        <Badge variant="outline">{ctx.fixture.ordinary.badge}</Badge>
        <Badge variant="destructive">{ctx.fixture.ordinary.badge}</Badge>
      </div>
    ),
    states: [
      {
        id: "default",
        label: "Default",
        render: (ctx) => <Badge>{ctx.fixture.ordinary.badge}</Badge>,
      },
      {
        id: "destructive",
        label: "Destructive",
        description: "A solid fill: white on the destructive token is 4.77:1.",
        render: (ctx) => <Badge variant="destructive">{ctx.fixture.ordinary.badge}</Badge>,
      },
      {
        id: "long-label",
        label: "Long text",
        render: (ctx) => <Badge>{ctx.fixture.long.badge}</Badge>,
      },
    ],
  },
  "atoms/skeleton": {
    summary: "A grey shape where content is loading.",
    a11y: [
      "aria-hidden: the region that is loading says so (aria-busy, or a Spinner), not each shape.",
      "Pulses only when the reader allows motion (motion-safe).",
    ],
    live: () => (
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    ),
    states: [
      {
        id: "card",
        label: "Card",
        render: () => (
          <div className="grid gap-2">
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ),
      },
    ],
  },
  "atoms/spinner": {
    summary: "Something is loading. Its name comes from the atoms' copy, in the locale.",
    a11y: [
      "role=status with an accessible name from props (catalogs.*.atoms.spinner.loading): no English of its own.",
      "Turns slower when the reader asks for reduced motion.",
      "A status region added with its name already in it is often not announced. In a button the button's name carries it; for a loading area, set aria-busy on the area or put text in a live region already on the page.",
    ],
    live: (ctx) => <Spinner label={catalogs[ctx.locale].atoms.spinner.loading} />,
    states: [
      {
        id: "default",
        label: "Default",
        render: (ctx) => <Spinner label={catalogs[ctx.locale].atoms.spinner.loading} />,
      },
      {
        id: "in-button",
        label: "In a button",
        description: "A disabled button while its action runs.",
        render: (ctx) => (
          <Button disabled>
            <Spinner label={catalogs[ctx.locale].atoms.spinner.loading} />
            {ctx.fixture.ordinary.action}
          </Button>
        ),
      },
    ],
  },
  "atoms/avatar": {
    summary: "A customer's picture, with their initials until it loads.",
    a11y: [
      "The image's alt is the person's name. If the image fails, only the initials are left, so show the name as text beside the avatar.",
      "Not a control: wrap it in a link or button for that, and name that.",
    ],
    live: (ctx) => (
      <Avatar size="lg">
        <AvatarImage alt={ctx.fixture.ordinary.personName} />
        <AvatarFallback>{initials(ctx.fixture.ordinary.personName)}</AvatarFallback>
      </Avatar>
    ),
    states: [
      {
        id: "sizes",
        label: "Sizes",
        description: "Small, default and large, with the fallback.",
        render: (ctx) => (
          <div className="flex items-center gap-3">
            {(["sm", "default", "lg"] as const).map((size) => (
              <Avatar key={size} size={size}>
                <AvatarFallback>{initials(ctx.fixture.ordinary.personName)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        ),
      },
      {
        id: "long-label",
        label: "Long name",
        description: "Two initials, whatever the name's length.",
        render: (ctx) => (
          <Avatar>
            <AvatarFallback>{initials(ctx.fixture.long.personName)}</AvatarFallback>
          </Avatar>
        ),
      },
    ],
  },
  "atoms/separator": {
    summary: "A line between groups of content, in the decorative border token.",
    a11y: [
      "role=separator with its orientation. The border token is decorative and not contrast-checked (D35).",
    ],
    live: (ctx) => (
      <div className="grid gap-3">
        <p>{ctx.fixture.ordinary.productName}</p>
        <Separator />
        <p>{ctx.fixture.ordinary.helpText}</p>
      </div>
    ),
    states: [
      {
        id: "vertical",
        label: "Vertical",
        render: (ctx) => (
          <div className="flex h-6 items-center gap-3">
            <span>{ctx.fixture.sizes[0]?.label}</span>
            <Separator orientation="vertical" />
            <span>{ctx.fixture.sizes[1]?.label}</span>
          </div>
        ),
      },
    ],
  },
  "atoms/kbd": {
    summary: "A key or a shortcut, as the locale's keyboards label it.",
    a11y: [
      "A kbd element: screen readers read the key names as text.",
      "Shown next to the action it triggers; never the only way to learn it.",
    ],
    live: (ctx) => (
      <KbdGroup>
        {ctx.fixture.shortcut.map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </KbdGroup>
    ),
    states: [
      {
        id: "single",
        label: "One key",
        render: (ctx) => <Kbd>{ctx.fixture.shortcut[0]}</Kbd>,
      },
    ],
  },
  "atoms/tooltip": {
    summary:
      "A short hint on hover or keyboard focus, for an icon button's name or a repeat of what is on screen.",
    a11y: [
      "Opens on hover and on keyboard focus, closes on Escape.",
      "Touch screens never show it: nothing a reader needs may live only in a tooltip.",
      "Sides are logical (inline-start, inline-end), so the arrow follows the page's direction.",
    ],
    live: (ctx) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={<Button size="icon" variant="outline" aria-label={ctx.fixture.ordinary.hint} />}
          >
            <HeartIcon aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>{ctx.fixture.ordinary.hint}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
    states: [
      {
        id: "open",
        label: "Open",
        description: "Shown open, as hover or focus opens it.",
        render: (ctx) => (
          <TooltipProvider>
            <Tooltip defaultOpen>
              <TooltipTrigger
                render={
                  <Button size="icon" variant="outline" aria-label={ctx.fixture.ordinary.hint} />
                }
              >
                <HeartIcon aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="bottom">{ctx.fixture.long.hint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
      },
    ],
  },
  "atoms/progress": {
    summary: "How far a task has got, with its label and value.",
    a11y: [
      "role=progressbar with aria-valuenow, named by its label.",
      "The value is also written out as text, not only drawn.",
    ],
    live: (ctx) => (
      <Progress value={60}>
        <ProgressLabel>{ctx.fixture.ordinary.progressLabel}</ProgressLabel>
        <ProgressValue />
      </Progress>
    ),
    states: [
      {
        id: "empty",
        label: "Empty",
        render: (ctx) => (
          <Progress value={0}>
            <ProgressLabel>{ctx.fixture.ordinary.progressLabel}</ProgressLabel>
            <ProgressValue />
          </Progress>
        ),
      },
      {
        id: "complete",
        label: "Complete",
        render: (ctx) => (
          <Progress value={100}>
            <ProgressLabel>{ctx.fixture.ordinary.progressLabel}</ProgressLabel>
            <ProgressValue />
          </Progress>
        ),
      },
      {
        id: "long-label",
        label: "Long label",
        render: (ctx) => (
          <Progress value={35}>
            <ProgressLabel>{ctx.fixture.long.progressLabel}</ProgressLabel>
            <ProgressValue />
          </Progress>
        ),
      },
    ],
  },
} satisfies Partial<Record<EntryId, DsStory>>;
