import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Payload } from "payload";
import { describe, expect, it, vi } from "vitest";

vi.mock("./brand.css", () => ({}));
const readSiteSettings = vi.hoisted(() => vi.fn());
vi.mock("../../lib/cms/site", () => ({ readSiteSettings }));
vi.mock("../../lib/fonts", () => ({
  inter: { style: { fontFamily: "'Inter', 'Inter Fallback'" } },
}));

import { AdminFont } from "./admin-font";
import { AdminIcon } from "./icon";
import { AdminLogo } from "./logo";

/** The published settings `readSiteSettings` gives (or the error it throws), and a logger. */
function payloadWith(settings: Record<string, unknown> | Error) {
  readSiteSettings.mockImplementation(async () => {
    if (settings instanceof Error) throw settings;
    return { updatedAt: "2026-11-08T00:00:00.000Z", ...settings };
  });
  const error = vi.fn();
  return { payload: { logger: { error } } as unknown as Payload, error };
}

const picture = { url: "/api/media/file/logo.png", width: 240, height: 60 };

/** The icon draws its store's mark in an inner async component: render that one. */
async function iconHtml(payload?: Payload) {
  const outer = AdminIcon(payload === undefined ? {} : { payload }) as ReactElement<{
    payload?: Payload;
  }>;
  const inner =
    typeof outer.type === "function"
      ? await (outer.type as (props: unknown) => Promise<ReactElement> | ReactElement)(outer.props)
      : outer;
  return renderToStaticMarkup(inner);
}

describe("the admin's logo (D108)", () => {
  it("is the site settings' logo, named by the store's name", async () => {
    const { payload } = payloadWith({ storeName: "Acme", logo: picture, icon: null });
    const html = renderToStaticMarkup(await AdminLogo({ payload }));
    expect(html).toContain('src="/api/media/file/logo.png"');
    expect(html).toContain('alt="Acme"');
    // The shop's cached read of the published settings, in the default language.
    expect(readSiteSettings).toHaveBeenCalledWith({ market: { language: "en" }, draft: false });
  });

  it("is the store's name as text while there is no logo", async () => {
    const { payload } = payloadWith({ storeName: "Acme", logo: null, icon: null });
    const html = renderToStaticMarkup(await AdminLogo({ payload }));
    expect(html).toBe('<span class="admin-logo admin-logo--name">Acme</span>');
  });

  it("is the code's store name for a blank one, as the shop's header", async () => {
    const { payload } = payloadWith({ storeName: "   ", logo: null, icon: null });
    expect(renderToStaticMarkup(await AdminLogo({ payload }))).toContain(">Shopblok</span>");
  });

  it("is the code's store name when the settings cannot be read, and says why in the log", async () => {
    const { payload, error } = payloadWith(new Error("connection refused"));
    const html = renderToStaticMarkup(await AdminLogo({ payload }));
    expect(html).toContain(">Shopblok</span>");
    expect(error).toHaveBeenCalledTimes(1);
  });
});

describe("the admin's icon (D108)", () => {
  it("is the site settings' icon, decorative inside Payload's named link", async () => {
    const { payload } = payloadWith({ storeName: "Acme", logo: null, icon: picture });
    const html = await iconHtml(payload);
    expect(html).toContain('src="/api/media/file/logo.png"');
    expect(html).toContain('alt=""');
  });

  it("is the store name's first letter without an icon, hidden from screen readers", async () => {
    const { payload } = payloadWith({ storeName: "ébène", logo: null, icon: null });
    const html = await iconHtml(payload);
    expect(html).toBe('<span class="admin-icon admin-icon--letter" aria-hidden="true">É</span>');
  });

  it("draws at once with no Local API (Payload's Open Graph picture)", async () => {
    expect(await iconHtml()).toContain(">S</span>");
  });
});

describe("the admin's typeface (D108)", () => {
  it("hands Inter's family to the stylesheet as --font-inter and renders its children", () => {
    const html = renderToStaticMarkup(
      <AdminFont>
        <p>child</p>
      </AdminFont>,
    );
    expect(html).toContain(":root{--font-inter:'Inter', 'Inter Fallback'}</style>");
    expect(html).toContain("<p>child</p>");
  });
});
