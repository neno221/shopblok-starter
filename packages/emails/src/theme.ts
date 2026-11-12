/**
 * The e-mails' colours: the shop's tokens (`packages/ui/src/styles/tokens.css`), as literal values,
 * since an e-mail client reads no CSS variables. `theme.test.ts` compares each with the token.
 */
export const theme = {
  /** `--background`: the card. */
  background: "#ffffff",
  /** `--muted`: the page around the card. */
  muted: "#f5f5f5",
  /** `--foreground`: text. */
  foreground: "#09090b",
  /** `--muted-foreground`: the small print (4.5:1 on `muted`). */
  mutedForeground: "#707070",
  /** `--border`. */
  border: "#e5e5e5",
  /** `--primary` and `--primary-foreground`: the button. */
  primary: "#000000",
  primaryForeground: "#fafafa",
  /** `--radius-md` (`--radius` 0.625rem − 2px). */
  radius: "8px",
  /** Inter where the client has it, then each system's own sans-serif. */
  font: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const;

/** The token each colour above comes from, for the test. */
export const THEME_TOKENS = {
  background: "background",
  muted: "muted",
  foreground: "foreground",
  mutedForeground: "muted-foreground",
  border: "border",
  primary: "primary",
  primaryForeground: "primary-foreground",
} as const satisfies Partial<Record<keyof typeof theme, string>>;
