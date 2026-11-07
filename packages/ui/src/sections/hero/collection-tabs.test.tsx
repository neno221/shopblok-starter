// T80: the `collection-switcher` hero's island, Base UI's tabs in happy-dom: the tab list named by
// the hero's heading, the first collection shown, and the arrow keys moving to the next tab and
// showing its picture and link at once (automatic activation). Nothing moves by itself.
import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HeroCollectionTabs } from "./collection-tabs";

vi.mock("next/link", async () =>
  (await import("../../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const collections = sectionFixtures.en.hero.collections.collections ?? [];
const shop = catalogs.en.sections.collectionSpotlight.shop;

function draw() {
  return render(
    <>
      <h2 id="hero-heading">Seasons</h2>
      <HeroCollectionTabs
        collections={collections}
        labelledBy="hero-heading"
        shopLabel={shop}
        prefetch={false}
      />
    </>,
  );
}

const visiblePanel = () => screen.getByRole("tabpanel");

describe("HeroCollectionTabs", () => {
  it("names the tab list by the heading, one tab per collection, the first shown", () => {
    draw();
    const list = screen.getByRole("tablist", { name: "Seasons" });
    expect(
      within(list)
        .getAllByRole("tab")
        .map((tab) => tab.textContent),
    ).toEqual(collections.map((each) => each.title));
    expect(within(list).getAllByRole("tab")[0]?.getAttribute("aria-selected")).toBe("true");
    const link = within(visiblePanel()).getByRole("link");
    expect(link.getAttribute("href")).toBe(collections[0]?.href);
  });

  it("moves to the next tab with the arrow key and shows its collection", async () => {
    draw();
    const user = userEvent.setup();
    const tabs = screen.getAllByRole("tab");
    tabs[0]?.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(within(visiblePanel()).getByRole("link").getAttribute("href")).toBe(
      collections[1]?.href,
    );
  });

  it("is the marked module first-load.ts keeps out (D102)", () => {
    expect(HeroCollectionTabs.displayName).toBe("shopblok:hero-collection-tabs");
  });
});
