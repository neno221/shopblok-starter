import { Header } from "../contracts";
import type { EntryInput } from "../types";

// SPEC §9.4's headers (T35) and footers (T36): the variants a shop picks in Payload's `header` and
// `footer` globals (`design`, §7.3), so each is its own entry, DS page and thumbnail in the family
// `header` or `footer` (D46), with the value the picker stores as `variant`. They share one
// contract per family.

const header = <const Variant extends string>(variant: Variant, label: string, name: string) =>
  ({
    id: `headers-footers/header-${variant}`,
    group: "headers-footers",
    kind: "organism",
    label: `Header · ${label}`,
    component: { module: `@shopblok/ui/organisms/header/${variant}`, name },
    family: "header",
    variant,
    contract: Header,
  }) as const satisfies EntryInput;

export const headersFooters = [
  // T35: the six headers of §9.4, in its order.
  header("classic", "Classic", "HeaderClassic"),
  header("centered", "Centered", "HeaderCentered"),
  header("two-tier", "Two-tier", "HeaderTwoTier"),
  header("mega-menu", "Mega menu", "HeaderMegaMenu"),
  header("minimal", "Minimal", "HeaderMinimal"),
  header("transparent", "Transparent", "HeaderTransparent"),
] as const satisfies readonly EntryInput[];
