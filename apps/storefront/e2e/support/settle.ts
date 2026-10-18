import type { Page } from "@playwright/test";

/**
 * T40 (D51): the page as it is when nothing is left to arrive, before a capture. `networkidle` says
 * the requests are done, not that the pictures are drawn: a `loading="lazy"` image below the fold
 * starts when Chromium decides (a full-page capture does not scroll), and a decode that ends
 * between two captures moves a few pixels, under ProductGallery's arrows (backdrop blur over the
 * picture) for one. So every image is made eager, loaded and decoded, the fonts are in, and one
 * frame has passed.
 */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const images = [...document.images];
    for (const image of images) image.loading = "eager";
    await Promise.all(
      images.map(async (image) => {
        // A picture that cannot load is the page's own problem (the console check reports it).
        if (!image.complete)
          await new Promise((resolve) => {
            image.addEventListener("load", resolve, { once: true });
            image.addEventListener("error", resolve, { once: true });
          });
        await image.decode().catch(() => undefined);
      }),
    );
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

/**
 * Runs `capture` with the viewport as tall as the page, then puts the viewport back. A full-page
 * capture resizes the viewport itself, and a client component that re-measures on a resize (embla,
 * under ProductGallery: its arrows' state) finishes after the capture has begun in some loads and
 * not in others, so the same page gave two pictures (3 of 6 ProductGallery cells, run twice, T40).
 * Sized first and given time to settle, the page is the same in every load. The height is read
 * again until it stops moving, because a box can depend on the viewport's height.
 */
export async function withPageSizedViewport<T>(
  page: Page,
  width: number,
  height: number,
  capture: () => Promise<T>,
): Promise<T> {
  let last = -1;
  for (let round = 0; round < 6; round++) {
    const wanted = await page.evaluate(() => document.documentElement.scrollHeight);
    if (wanted === last) break;
    last = wanted;
    await page.setViewportSize({ width, height: wanted });
    await page.waitForTimeout(300);
  }
  try {
    return await capture();
  } finally {
    await page.setViewportSize({ width, height });
  }
}
