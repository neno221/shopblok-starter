import { LOCALES } from "@shopblok/i18n";
import { describe, expect, it } from "vitest";
import { PRIVACY_COOKIE_SETTINGS_URL, privacyLayout } from "./pages";

// M6 D123 (T97): the privacy page, which is the cookie policy too, links "Cookie settings".
type Node = { type: string; text?: string; fields?: { url?: string }; children?: Node[] };
const links = (node: Node): Node[] => [
  ...(node.type === "link" ? [node] : []),
  ...(node.children ?? []).flatMap(links),
];

describe("the privacy page's seed (T65, T97)", () => {
  const [block] = privacyLayout(true) as unknown as [{ content: Record<string, { root: Node }> }];

  it('links "Cookie settings" to #cookie-settings on the page, in every language', () => {
    expect(PRIVACY_COOKIE_SETTINGS_URL).toBe("/privacy#cookie-settings");
    for (const language of LOCALES) {
      const found = links(block.content[language]!.root);
      expect(found, language).toHaveLength(1);
      expect(found[0]!.fields?.url, language).toBe(PRIVACY_COOKIE_SETTINGS_URL);
      expect(found[0]!.children?.[0]?.text?.trim(), language).toBeTruthy();
    }
  });

  it("is T65's text with one paragraph more, so a shop that kept T65's gets it", () => {
    const [before] = privacyLayout(false) as unknown as [
      { content: Record<string, { root: Node }> },
    ];
    for (const language of LOCALES) {
      const was = before.content[language]!.root.children!;
      const now = block.content[language]!.root.children!;
      expect(now.slice(0, -1), language).toEqual(was);
      expect(now).toHaveLength(was.length + 1);
      expect(links(before.content[language]!.root)).toEqual([]);
    }
  });
});
