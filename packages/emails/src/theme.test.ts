import { colors } from "@shopblok/ui/tokens";
import { describe, expect, it } from "vitest";
import { directionOf } from "./direction";
import { THEME_TOKENS, theme } from "./theme";

describe("the e-mails' theme", () => {
  it.each(Object.entries(THEME_TOKENS))("%s is the token --%s", (key, token) => {
    const found = colors.find((color) => color.name === token);
    expect(found?.value).toBe(theme[key as keyof typeof THEME_TOKENS]);
  });
});

describe("directionOf", () => {
  it.each([
    ["fa", "rtl"],
    ["ar-EG", "rtl"],
    ["he", "rtl"],
    ["el", "ltr"],
    ["en", "ltr"],
    ["", "ltr"],
  ])("%s is %s", (language, dir) => {
    expect(directionOf(language)).toBe(dir);
  });
});
