import { viewports } from "@shopblok/ui/tokens";

/**
 * The three widths the viewport switcher shows (SPEC §9.6), read from the `--viewport-*` tokens by
 * name so that a token change moves the preview with it. The token list also has `laptop`
 * (1024 px), which the switcher leaves out. A name that is gone or a value that is not in `px`
 * throws, so a rename fails the build and the tests instead of silently dropping a width.
 */
export const VIEWPORT_NAMES = ["phone", "tablet", "desktop"] as const;

export function viewportWidths(): number[] {
  return VIEWPORT_NAMES.map((name) => {
    const token = viewports.find((viewport) => viewport.name === name);
    const match = token === undefined ? null : /^(\d+)px$/.exec(token.value);
    if (match?.[1] === undefined) {
      throw new Error(`The viewport token "${name}" is missing or not a width in px.`);
    }
    return Number(match[1]);
  });
}
