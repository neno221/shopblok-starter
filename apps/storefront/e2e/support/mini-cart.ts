import { expect, type Locator, type Page } from "@playwright/test";

// The header's mini cart (T85, D101) for `cart-variants` and `variants` (T91).

/**
 * The header's cart, clicked until the drawer it opens says it is `variant`: the island draws its
 * trigger, and the drawer's code loads, on the first press, and a stale read of the global may
 * still name the mini cart it had (`max`).
 */
export async function openMiniCart(page: Page, variant: string): Promise<Locator> {
  const drawer = page.locator('[data-slot="cart-drawer"]');
  await expect(async () => {
    if (await drawer.isVisible()) await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await page
      .locator(
        'header [data-slot="cart-island"] button:visible, header a[data-slot="cart-button"]:visible',
      )
      .first()
      .click();
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute("data-variant", variant);
  }).toPass({ timeout: 20_000 });
  return drawer;
}
