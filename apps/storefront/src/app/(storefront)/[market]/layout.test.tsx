import { catalogs } from "@shopblok/i18n";
import { fileURLToPath } from "node:url";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { prerender } from "react-dom/static";
import { afterEach, describe, expect, it, vi } from "vitest";
import { pick, SHELL_MESSAGES } from "../../../i18n/messages";
import type { MarketMap } from "../../../lib/markets/types";
import { brazil, mongolia, seeded } from "../../../lib/markets/test-maps";

const state = vi.hoisted(() => ({
  key: "",
  map: undefined as unknown as MarketMap,
}));
vi.mock("next/root-params", () => ({ market: async () => state.key }));
vi.mock("../../../lib/markets/cached-market-map", () => ({
  getRenderMarketMap: async () => state.map,
}));
// `next/font` only works inside Next's build; the layout's markup is what is under test.
vi.mock("../../../lib/fonts", () => ({
  inter: { variable: "inter-variable" },
}));
// The shell (T48) has tests of its own; here it is a stand-in, so the layout reads no Medusa.
vi.mock("../../../components/shell/shell-data", () => ({
  getShellData: async () => ({
    url: (path: string) => path,
    homes: [],
    settings: {
      storeName: "Kalimera",
      titleTemplate: "%s · Kalimera",
      seo: { description: "Linen for warm days." },
      organization: {},
    },
  }),
}));
vi.mock("../../../components/shell/header", () => ({ SiteHeader: () => null }));
vi.mock("../../../components/shell/footer", () => ({ SiteFooter: () => null }));
// `next-intl`'s root entry is the Server Component build under the `react-server` condition, which
// Vitest does not set: its provider reads the request configuration itself, as it does in Next.
vi.mock("next-intl", async () => {
  const entry = fileURLToPath(
    new URL(
      "../../../../node_modules/next-intl/dist/esm/development/index.react-server.js",
      import.meta.url,
    ),
  );
  return (await import(/* @vite-ignore */ entry)) as object;
});

import RootLayout, { generateMetadata } from "./layout";

afterEach(() => {
  state.key = "";
});

type Props = {
  lang?: string;
  messages?: unknown;
  copy?: unknown;
  children?: ReactNode;
};

/** The first element in `node`'s tree for which `test` holds, looking through `props.children`. */
function find(node: ReactNode, test: (props: Props) => boolean): ReactElement<Props> | undefined {
  if (!isValidElement<Props>(node)) return undefined;
  if (test(node.props)) return node;
  const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
  for (const child of children as ReactNode[]) {
    const found = find(child, test);
    if (found !== undefined) return found;
  }
  return undefined;
}

async function layoutFor(map: MarketMap, key: string) {
  state.map = map;
  state.key = key;
  return RootLayout({ children: <p>child</p> }) as Promise<ReactElement<Props>>;
}

async function html(tree: ReactElement): Promise<string> {
  const { prelude } = await prerender(tree);
  return new Response(prelude).text();
}

/** What the layout hands `Providers`: the toast region and its close button, named in the page's language. */
function toastCopy(tree: ReactElement<Props>): unknown {
  return find(tree, (props) => props.copy !== undefined)?.props.copy;
}

describe("the market layout's metadata (T61)", () => {
  it("titles pages with the site settings' store name and template", async () => {
    expect((await generateMetadata()).title).toEqual({
      default: "Kalimera",
      template: "%s · Kalimera",
    });
  });

  it("describes every page that has no description of its own as the site settings do (T68)", async () => {
    expect((await generateMetadata()).description).toBe("Linen for warm days.");
  });
});

describe("the market layout (D62)", () => {
  it("gives the client provider the shell's messages and no catalog", async () => {
    for (const [map, key, catalog] of [
      [seeded, "el-cy", catalogs.el],
      [seeded, "fr-ch", catalogs.fr],
      [mongolia, "mn-mn", catalogs.en],
    ] as const) {
      const provider = find(await layoutFor(map, key), (props) => props.messages !== undefined);
      expect(provider, key).toBeDefined();
      expect(provider?.props.messages, key).toEqual(pick(catalog, SHELL_MESSAGES));
      const sent = JSON.stringify(provider?.props.messages);
      for (const left of ["cartLineItem", "productCard", "designSystem", "atoms"]) {
        expect(sent, `${key}: ${left}`).not.toContain(left);
      }
    }
  });

  // PR 70 review, item 2: the layout is outside every error boundary, so a catalog that lacks a shell
  // message must not make it throw (every page of the language would answer 500).
  it("shows the English message, and does not throw, when a catalog lacks a shell message", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = catalogs.de.templates.error as Record<string, unknown>;
    const held = error["body"];
    delete error["body"];
    try {
      const provider = find(
        await layoutFor(seeded, "de-ch"),
        (props) => props.messages !== undefined,
      );
      expect(provider?.props.messages).toEqual({
        templates: {
          error: { ...catalogs.de.templates.error, body: catalogs.en.templates.error.body },
        },
      });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('de catalog has no message at "templates.error.body"'),
      );
    } finally {
      error["body"] = held;
    }
  });

  it("sets the page's lang from the market and names the toast region in its language", async () => {
    const greek = await layoutFor(seeded, "el-cy");
    expect(greek.props.lang).toBe("el-CY");
    expect(await html(greek)).toContain(`lang="el-CY"`);
    expect(toastCopy(greek)).toEqual({
      toastRegion: catalogs.el.primitives.toast.region,
      toastClose: catalogs.el.primitives.toast.close,
    });

    const german = await layoutFor(seeded, "de-ch");
    expect(german.props.lang).toBe("de-CH");
    expect(toastCopy(german)).toEqual({
      toastRegion: catalogs.de.primitives.toast.region,
      toastClose: catalogs.de.primitives.toast.close,
    });
  });

  // PR 70 review, item 1. The root layout is outside every error boundary: a value next-intl cannot
  // use would make every page of the market a 500, its 404 page too.
  it("renders a market whose stored lang value is no language tag, with the lang that language and country make", async () => {
    for (const stored of ["pt_BR", "Portuguese"]) {
      const map: MarketMap = {
        ...brazil,
        languages: [{ code: "pt", medusaLocale: "pt-BR", htmlLang: stored }],
      };
      const tree = await layoutFor(map, "pt-br");
      expect(tree.props.lang, stored).toBe("pt-BR");
      expect(await html(tree), stored).toContain('lang="pt-BR"');
    }
  });

  it("sets lang from a market whose language has no catalog and names the region in English", async () => {
    const overridden: MarketMap = {
      ...mongolia,
      languages: [{ code: "mn", medusaLocale: "mn-MN", htmlLang: "mn" }],
    };
    const tree = await layoutFor(overridden, "mn-mn");
    expect(tree.props.lang).toBe("mn");
    expect(await html(tree)).toContain('lang="mn"');
    expect(toastCopy(tree)).toEqual({
      toastRegion: catalogs.en.primitives.toast.region,
      toastClose: catalogs.en.primitives.toast.close,
    });
  });
});
