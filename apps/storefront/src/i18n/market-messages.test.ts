import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { catalogs } from "@shopblok/i18n";
import { describe, expect, it, vi } from "vitest";
import { findMarket } from "../lib/markets/market";
import { seeded } from "../lib/markets/test-maps";
import { withLocale } from "../lib/market-locale";

const state = vi.hoisted(() => ({
  read: (async () => null) as (reader: unknown) => Promise<Record<string, string> | null>,
}));
vi.mock("../lib/cms/ui-strings", () => ({
  readUiStrings: (reader: unknown) => state.read(reader),
}));

import { messagesFor } from "./market-messages";

const greek = () => {
  const market = findMarket(seeded, "el-cy");
  if (market === undefined) throw new Error("no el-cy market");
  return withLocale(market);
};

describe("messagesFor (D77)", () => {
  it("is the market's catalog itself with nothing edited, or with no database", async () => {
    expect(await messagesFor(greek())).toBe(catalogs.el);
  });

  it("puts the language's edited strings over its catalog", async () => {
    state.read = async () => ({ "organisms.quickCartDropdown.title": "Μπήκε στο καλάθι" });
    const messages = await messagesFor(greek());
    expect(messages.organisms.quickCartDropdown.title).toBe("Μπήκε στο καλάθι");
    expect(messages.organisms.quickCartDropdown.close).toBe(
      catalogs.el.organisms.quickCartDropdown.close,
    );
    expect(catalogs.el.organisms.quickCartDropdown.title).not.toBe("Μπήκε στο καλάθι");
    state.read = async () => null;
  });
});

// PR 93 review, item 1: copy drawn outside next-intl's request config (server actions, route
// handlers) came from the bare catalog, so an edit showed on the page and went on the next answer.
describe("every shop module takes its copy from messagesFor", () => {
  const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return files(full);
      return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
    });

  // The content seed (T65) is not a shop module: it writes the code catalog's words once as a
  // page's starting texts (the seeded Home's headings), which are the editors' from then on.
  it("indexes `catalogs` only in i18n/, the design system (which has no database) and the seed", () => {
    const readers = files(src)
      .filter(
        (file) =>
          !/[\\/](i18n|design-system|app[\\/]design-system|payload[\\/]seed)[\\/]/.test(file),
      )
      .filter((file) => /catalogs\[/.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(src, file));
    expect(readers).toEqual([]);
  });
});
