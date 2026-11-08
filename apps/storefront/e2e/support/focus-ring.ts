import type { Locator } from "@playwright/test";

/** What the focused element shows and what it is measured against, with their contrast ratio. */
export type FocusIndicator = {
  /** `outline` (drawn outside the element) or `border` (a field's own edge). */
  kind: "outline" | "border";
  color: string;
  width: number;
  background: string;
  ratio: number;
};

/**
 * The focus indicator of `target`'s element, which must have focus (T90, D108): its outline when
 * it draws one, else its border; and the contrast of that colour with what lies behind it (WCAG
 * 2.4.13 and 1.4.11 ask 3:1). An outline is measured against the nearest opaque background around
 * the element, a border against the element's own background and the one around it, whichever is
 * closer. axe has no rule for a focus ring's colour, so this is the check that a theme colour too
 * light for its background fails. `card` names an ancestor that draws the ring for an input hidden
 * inside it (the variant picker's card).
 */
export function focusIndicator(target: Locator, card?: string): Promise<FocusIndicator> {
  return target.evaluate((element, card) => {
    if (document.activeElement !== element) throw new Error("the element does not have focus");
    const ringOwner = card ? (element.closest(card) as HTMLElement | null) : element;
    if (ringOwner === null) throw new Error(`no ${card} around the focused element`);
    type Rgba = [number, number, number, number];
    const parse = (value: string): Rgba => {
      const parts = value.match(/[\d.]+/g)?.map(Number) ?? [];
      return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
    };
    const over = (top: Rgba, under: Rgba): Rgba => {
      const a = top[3];
      return [0, 1, 2].map((i) => top[i]! * a + under[i]! * (1 - a)).concat(1) as Rgba;
    };
    const luminance = ([r, g, b]: Rgba) =>
      [r, g, b]
        .map((c) => c / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0);
    const contrast = (a: Rgba, b: Rgba) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi! + 0.05) / (lo! + 0.05);
    };
    /** The colour behind `from`: its backgrounds and its ancestors', blended down to white. */
    const behind = (from: Element | null): Rgba => {
      const layers: Rgba[] = [];
      for (let node = from; node !== null; node = node.parentElement) {
        const colour = parse(getComputedStyle(node).backgroundColor);
        if (colour[3] > 0) layers.push(colour);
        if (colour[3] >= 1) break;
      }
      return layers.reduceRight<Rgba>((under, top) => over(top, under), [255, 255, 255, 1]);
    };
    const style = getComputedStyle(ringOwner);
    const css = (colour: Rgba) => `rgb(${colour.slice(0, 3).map(Math.round).join(", ")})`;
    const outlineWidth = parseFloat(style.outlineWidth);
    if (style.outlineStyle !== "none" && outlineWidth > 0) {
      const background = behind(ringOwner.parentElement);
      const colour = over(parse(style.outlineColor), background);
      return {
        kind: "outline" as const,
        color: css(colour),
        width: outlineWidth,
        background: css(background),
        ratio: contrast(colour, background),
      };
    }
    const inside = behind(ringOwner);
    const outside = behind(ringOwner.parentElement);
    const colour = over(parse(style.borderTopColor), outside);
    const [ratio, background] =
      contrast(colour, inside) <= contrast(colour, outside)
        ? [contrast(colour, inside), inside]
        : [contrast(colour, outside), outside];
    return {
      kind: "border" as const,
      color: css(colour),
      width: parseFloat(style.borderTopWidth),
      background: css(background),
      ratio,
    };
  }, card);
}
