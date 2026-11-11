import { expect, test } from "@playwright/test";
import { fixtureNow } from "@shopblok/fixtures";
import { entries } from "@shopblok/registry";
import { interactions } from "../src/design-system/interactions";
import { settle } from "./support/settle";

// T40 (D52): the thumbnail of each variant a shop picks (the 21 family entries, D46) is its
// preview, `/design-system/en/preview/{id}`, the live render alone, captured at 1200 × 800 CSS px
// with a device scale factor of 0.5 (the `thumbnails` project), so the PNG is 600 × 400 (3:2,
// SPEC §7.4). It is that preview's baseline too, at `public/registry/{id}.png` (the config's
// snapshotPathTemplate), so the thumbnail and the screenshot are one file (SPEC §9.6). A normal run
// compares; `pnpm thumbnails` and the update-baselines job write them. Same server and flag as the
// `design-system` project.
const base = process.env["E2E_BASE_URL"] ?? "http://localhost:8000";

const family = entries.filter((entry) => entry.thumbnail !== undefined);

/**
 * The members whose live render is a closed overlay (the quick view's first look, the two mini
 * carts): only their button, so the picker's cards showed a lone button and the two mini carts
 * looked the same (W7 review item 4). Their thumbnail is the overlay open: the trigger pressed,
 * the popup visible. The quick view's other two looks are drawn open already.
 */
const OPENED: Record<string, { trigger: string; opens: string; reveal?: string }> = {
  "organisms/quick-view-dialog": interactions["organisms/quick-view-dialog"],
  "organisms/cart-drawer": interactions["organisms/cart-drawer"],
  // The picks are under the lines: the drawer's body is scrolled to them, so the card shows what
  // this member adds to the first.
  "organisms/cart-drawer-picks": {
    ...interactions["organisms/cart-drawer"],
    reveal: '[data-slot="cart-picks"]',
  },
};

test("there are thumbnails to make", () => {
  expect(family.length, "the registry's family entries").toBeGreaterThan(0);
});

for (const entry of family) {
  test(`${entry.id} · thumbnail`, async ({ page }) => {
    // D50: the same fixed clock as the cells.
    await page.clock.setFixedTime(new Date(fixtureNow));
    const url = `/design-system/en/preview/${entry.id}`;
    const response = await page.goto(url, { waitUntil: "load" });
    expect(response?.status(), `${base}${url} answers 200`).toBe(200);
    await page.waitForLoadState("networkidle");
    const opened = OPENED[entry.id];
    if (opened !== undefined) {
      const trigger = page.locator(opened.trigger).filter({ visible: true }).first();
      const popup = page.locator(opened.opens).filter({ visible: true }).first();
      // A press before hydration does nothing, so press again until it opens (as D45's checks).
      await expect(async () => {
        if (!(await popup.isVisible())) await trigger.click();
        await expect(popup).toBeVisible({ timeout: 1_000 });
      }).toPass({ timeout: 10_000 });
      if (opened.reveal !== undefined)
        await page
          .locator(opened.reveal)
          .first()
          .evaluate((element) => element.scrollIntoView({ block: "start" }));
      // The overlay's entrance transition, done.
      await page.waitForFunction(() =>
        document.getAnimations().every((animation) => animation.playState !== "running"),
      );
    }
    await settle(page);
    // The viewport, not the page: every thumbnail is the same 3:2. `scale: "device"` keeps the
    // device pixels, 600 × 400, instead of the CSS pixels (1200 × 800).
    const parts = entry.id.split("/");
    parts[parts.length - 1] += ".png";
    await expect(page).toHaveScreenshot(parts, { scale: "device" });
  });
}
