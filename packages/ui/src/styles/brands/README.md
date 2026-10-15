# Brand files

A brand file, `brands/<name>.css`, restyles the storefront for one brand without touching a component (SPEC §9.2, M1 plan D27). **M1 ships none**; this folder holds only this note.

## What a brand file may reassign

Only these, and only as plain declarations on `:root`, loaded after `globals.css`:

- **Semantic colours**, the custom properties `tokens.css` declares in `:root`: the shadcn contract (`--background`, `--foreground`, `--primary`, `--ring` …) and the commerce additions (`--price`, `--price-sale`, `--badge-sale`, `--stock-low` …). The `@theme inline` block maps each to a Tailwind colour (`--color-primary: var(--primary)`), so a reassigned variable reaches every utility.
- **Fonts**: the variable `next/font` sets (`--font-inter`) or `--font-sans` itself.
- **The radius**: `--radius` alone. The scale (`--radius-xs` to `--radius-4xl`) is calculated from it, so one value moves every corner.

```css
/* brands/example.css: an example, not shipped */
:root {
  --primary: #1d4ed8;
  --primary-foreground: #ffffff;
  --radius: 0.25rem;
}
```

## What it may not change

- The **primitives** (`--neutral-450` …), the type scale, spacing, breakpoints, z-index, shadows and motion. They are the design system's, not a brand's.
- **Anything in `@theme inline`.** A brand file reassigns the variables it reads, never the mapping.

## The contrast gate does not see a brand file

The build checks the pairs in `shopblok.tokens.json` against the values in `tokens.css` (SPEC §13, D35). A brand that reassigns a colour has to keep each pair it touches at 4.5:1 for text and 3:1 for UI components; the pairs are listed in `packages/ui/src/tokens.ts`. Checking a brand file's own values is a task for the milestone that ships the first brand.
