import type { EntryInput } from "../types";

// The DS's eight Foundations pages (T22), in the navigation's order. They document the tokens and
// render no component of their own.
export const foundations = [
  { id: "foundations/colors", group: "foundations", kind: "foundation", label: "Colors" },
  { id: "foundations/typography", group: "foundations", kind: "foundation", label: "Typography" },
  { id: "foundations/spacing", group: "foundations", kind: "foundation", label: "Spacing" },
  { id: "foundations/radius", group: "foundations", kind: "foundation", label: "Radius" },
  { id: "foundations/shadows", group: "foundations", kind: "foundation", label: "Shadows" },
  { id: "foundations/motion", group: "foundations", kind: "foundation", label: "Motion" },
  {
    id: "foundations/layout",
    group: "foundations",
    kind: "foundation",
    label: "Breakpoints and layers",
  },
  {
    id: "foundations/icons-credits",
    group: "foundations",
    kind: "foundation",
    label: "Icons and credits",
  },
] as const satisfies readonly EntryInput[];
