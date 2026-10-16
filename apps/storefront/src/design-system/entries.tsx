import { atoms } from "./atoms";
import { Colors } from "./foundations/colors";
import { IconsAndCredits } from "./foundations/icons";
import { LayoutTokens } from "./foundations/layout";
import { Motion } from "./foundations/motion";
import { Radius } from "./foundations/radius";
import { Shadows } from "./foundations/shadows";
import { Spacing } from "./foundations/spacing";
import { Typography } from "./foundations/typography";
import type { DsEntry } from "./types";

// The manifest of the design-system pages (D33, T22 step 4): every entry is a page at
// `/design-system/[locale]/{id}` and a frame at `/design-system/[locale]/frame/{id}`, in all four
// locales. M2's registry (`@shopblok/registry`) replaces this file.
//
// To add an atom (T21, T23): write its entry in `atoms.tsx`, with `group: "atoms"`, an id
// `atoms/{slug}`, its a11y notes, a `live` render and one `states` item per state, and take every
// sample string, price and size from `ctx.fixture` (`@shopblok/fixtures`). The `Atoms` group
// appears in the navigation with its first entry. `entries.test.ts` checks the ids, the notes and
// that each entry renders in each locale.

const foundations: readonly DsEntry[] = [
  {
    id: "foundations/colors",
    group: "foundations",
    label: "Colors",
    summary:
      "Every colour token with the kit's value beside ours where we override it, and the contrast ratio of each pair.",
    a11y: [
      "Text pairs need 4.5:1 and UI pairs 3:1 (WCAG 2.2 AA); the build stops below that, and this table shows the result.",
      "Never carry meaning by colour alone (WCAG 1.4.1): sale, stock and status tokens always come with a word or a shape.",
      "The swatches are decorative; each colour's name and value are text next to it.",
    ],
    live: () => <Colors />,
  },
  {
    id: "foundations/typography",
    group: "foundations",
    label: "Typography",
    summary:
      "The type scale and weights, set in the locale's own text. Greek pages use Inter's Greek subset.",
    a11y: [
      "Body text starts at 16 px (text-base); the smaller steps are for secondary text only.",
      "Line heights are set with each size, so text can be enlarged to 200 % without overlapping (WCAG 1.4.4).",
      "Long words break (overflow-wrap) instead of running out of the box.",
    ],
    live: (ctx) => <Typography ctx={ctx} />,
  },
  {
    id: "foundations/spacing",
    group: "foundations",
    label: "Spacing",
    summary: "Tailwind's 4 px step and the multiples the components use.",
    a11y: [
      "Interactive elements are at least 44 × 44 px (D32): a step of 11 is 44 px.",
      "Spacing is in rem, so it grows with the reader's font size.",
    ],
    live: () => <Spacing />,
  },
  {
    id: "foundations/radius",
    group: "foundations",
    label: "Radius",
    summary: "One --radius and the scale derived from it.",
    a11y: [
      "Corners are decoration: a control's edge must still reach 3:1 against its background (WCAG 1.4.11).",
    ],
    live: () => <Radius />,
  },
  {
    id: "foundations/shadows",
    group: "foundations",
    label: "Shadows",
    summary: "The kit's seven effect styles.",
    a11y: [
      "A shadow is never the only sign of a boundary or a state; pair it with a border or a text change.",
    ],
    live: () => <Shadows />,
  },
  {
    id: "foundations/motion",
    group: "foundations",
    label: "Motion",
    summary:
      "The three durations and the standard easing, with a bar that moves on hover and focus.",
    a11y: [
      "Transitions are written with motion-safe: with prefers-reduced-motion: reduce nothing moves (WCAG 2.3.3).",
      "The demo is a button, so it can be reached and triggered with the keyboard.",
    ],
    live: () => <Motion />,
  },
  {
    id: "foundations/layout",
    group: "foundations",
    label: "Breakpoints and layers",
    summary:
      "Tailwind's breakpoints, the design widths the screens are checked at, and the z-index layers.",
    a11y: [
      "Layout is checked at 375, 768 and 1440 px, with no horizontal scrolling at 320 CSS px (WCAG 1.4.10).",
      "Layers order what overlaps; a modal moves focus into itself and returns it (atoms that open layers say how).",
    ],
    live: () => <LayoutTokens />,
  },
  {
    id: "foundations/icons-credits",
    group: "foundations",
    label: "Icons and credits",
    summary: "The icons the atoms use, and the credits for the kit and the typeface.",
    a11y: [
      "A decorative icon has aria-hidden; an icon that stands alone as a control gets an accessible name from its button.",
    ],
    live: () => <IconsAndCredits />,
  },
];

export const entries: readonly DsEntry[] = [...foundations, ...atoms];
