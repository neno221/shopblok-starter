# The kit's atoms

The design kit is **"shadcn/ui – Design System by ReUI"**, a Figma Community file by ReUI, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Shopblok's tokens and atoms are adapted from it. Our copy is file `1PUSIlNviAwiZT0praTxES` (SPEC §9.1).

## What this copy draws (T18, 2026-10-15)

**None of SPEC §9.3's interactive atoms.** The copy has no component set for Button, IconButton, Input, Textarea, Select, Checkbox, Radio, Switch, Badge, Tooltip, Progress or any other shadcn component. It has one component set, `.Chart / Dot`, and 469 loose components:

| Section | What it holds | Relevant atom |
|---|---|---|
| Payment Methods | `Payment Method / visa`, `mastercard`, `maestro`, `ideal`, `klarna`, `apple-pay`, `google-pay`, `paypal`, `wechat` | PaymentIcon. There is no Revolut Pay, which SPEC §9.3 names |
| Country Flags | `Tabler Flag / <country>`, from the Tabler flag set | Flag |
| Avatars | avatar images | Avatar (pictures only, not the component) |
| Brand Logos | third-party brand logos | none |
| File Types | `PDF`, `PNG`, `JPG`, `CSV` and the rest | none |
| Patterns, Mixed Visuals | background patterns and illustrations | none |

Each section is laid out on a `.Component Canvas` instance of a component from another library, so its frames don't come with the file.

No PNGs are committed. The cloud container that ran T18 cannot reach figma.com's asset host (the proxy refused it), so the screenshots couldn't be saved. A session on your PC can add `payment-methods.png` (node `43059:39036`) and `flags.png` (node `40108:15345`) with `get_screenshot`.

## What the kit's variables say about the atoms

These come from `packages/ui/tokens/figma.tokens.json`, not from drawn components:
- **Radius:** `Shadcn/radius/*` is xs 2, sm 6, md 8, lg 10, xl 14, 2xl 18, 3xl 22, 4xl 26.
- **Focus ring:** the `ring/default` effect style is a 3 px spread with no blur in `Mode/opacity/ring-50` (`#a1a1a180`). `ring/focus`, `ring/destructive`, `ring/info`, `ring/success` and `ring/warning` use the same 3 px in their hue at 20 % alpha.
- **Type:** Inter at 400, 500, 600 and 700. There are 92 text styles; one of them is Bold.

## Atoms the copy doesn't draw

All of SPEC §9.3's atoms except PaymentIcon and Flag:
Button, IconButton, Link, Input, Textarea, Select, NativeSelect, Checkbox, Radio, Switch, Label, Badge, Chip, Price, Rating, Swatch, SizePill, QuantityStepper, Skeleton, Spinner, Avatar, Icon, Logo, Separator, Kbd, Tooltip, Progress, StockIndicator, VisuallyHidden and Image.

Their sizes come from shadcn's and ReUI's registries (D29, D32). A complete copy of the Community file would add the shadcn ones (plan §0 item 1).
