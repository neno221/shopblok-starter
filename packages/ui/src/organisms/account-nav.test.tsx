// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"). AccountNav's tests, in Testing
// Library and happy-dom: a navigation named "Account", the pages as links with the current one
// `aria-current="page"` (drawn by weight and fill, not colour alone), 44 px pills that wrap below
// `md` (nothing scrolls sideways), "Sign out" as a form that posts unless its action is a function,
// Tab through it in order, a long German and Greek label, and the four catalogs.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { AccountNav, type AccountNavProps } from "./account-nav";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const copyOf = (locale: Locale) => catalogs[locale].organisms.accountNav;
const navOf = (locale: Locale) => commerceFixtures[locale].account.nav;

function element(locale: Locale = "en", props: Partial<AccountNavProps> = {}) {
  return <AccountNav {...navOf(locale)} copy={copyOf(locale)} prefetch={false} {...props} />;
}

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((each) => each.getAttribute("class") ?? "");

describe("AccountNav", () => {
  it.each(LOCALES)("is a navigation named 'Account' with every page, in %s", (locale) => {
    render(element(locale));
    const nav = screen.getByRole("navigation", { name: copyOf(locale).label });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual(
      navOf(locale).items.map((item) => [item.label, item.href]),
    );
    for (const link of links) expect(link.getAttribute("data-prefetch")).toBe("false");
  });

  it.each(LOCALES)("marks the page the customer is on, and only it, in %s", (locale) => {
    render(element(locale));
    const current = navOf(locale).items.find((item) => item.id === navOf(locale).current);
    const marked = document.querySelectorAll('[aria-current="page"]');
    expect(marked).toHaveLength(1);
    expect(marked[0]?.textContent).toBe(current?.label);
    // Weight and fill, not colour alone.
    expect(marked[0]?.className).toContain("font-semibold");
    expect(marked[0]?.className).toContain("bg-muted");
  });

  it("moves the mark with `current`", () => {
    render(element("en", { current: "addresses" }));
    expect(screen.getByRole("link", { name: "Addresses" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByRole("link", { name: "Orders" }).hasAttribute("aria-current")).toBe(false);
  });

  it("draws 44 px links that wrap as pills below md and stand in a column from md", () => {
    render(element("en"));
    const list = screen.getByRole("list");
    expect(list.className).toContain("flex-wrap");
    expect(list.className).toContain("md:flex-col");
    expect(list.className).not.toMatch(/overflow-x-(?:auto|scroll)/);
    for (const link of screen.getAllByRole("link")) {
      expect(link.className).toContain("min-h-11");
      expect(link.className).toContain("focus-visible:ring-ring");
    }
  });

  it("signs out with a form that posts, never a link", () => {
    render(element("en", { signOutAction: "/account/sign-out" }));
    const form = slot("account-nav-sign-out") as HTMLFormElement;
    expect(form.getAttribute("method")).toBe("post");
    expect(form.getAttribute("action")).toBe("/account/sign-out");
    const button = within(form).getByRole("button", { name: "Sign out" });
    expect(button.getAttribute("type")).toBe("submit");
    expect(button.className).toContain("min-h-11");
    expect(screen.queryByRole("link", { name: "Sign out" })).toBeNull();
  });

  it("leaves the method to a server action, and draws no button without an action", () => {
    const { unmount } = render(element("en", { signOutAction: async () => {} }));
    expect(slot("account-nav-sign-out")?.hasAttribute("method")).toBe(false);
    unmount();
    render(element("en"));
    expect(slot("account-nav-sign-out")).toBeNull();
  });

  it("takes another name when a page has two", () => {
    render(element("en", { label: "Account, compact" }));
    expect(screen.getByRole("navigation", { name: "Account, compact" })).toBeTruthy();
  });

  it("is reached with Tab in the order it is drawn, sign out last", async () => {
    render(element("en", { signOutAction: "/account/sign-out" }));
    const user = userEvent.setup();
    const seen: string[] = [];
    for (let press = 0; press < 7; press++) {
      await user.tab();
      seen.push(document.activeElement?.textContent ?? "");
    }
    expect(seen).toEqual([...navOf("en").items.map((item) => item.label), "Sign out"]);
  });

  it.each(longLabels)("wraps a long %s label and cuts nothing", (locale, long) => {
    const nav = navOf(locale);
    render(
      element(locale, {
        items: nav.items.map((item) => ({ ...item, label: long.linkLabel })),
        copy: { ...copyOf(locale), signOut: long.action },
        signOutAction: "/sign-out",
      }),
    );
    const root = slot("account-nav") as HTMLElement;
    expect(classesIn(root).filter((each) => CLIPPING_CLASSES.test(each))).toEqual([]);
    for (const link of screen.getAllByRole("link")) {
      expect(link.className).toContain("wrap-anywhere");
      expect(link.className).toContain("max-w-full");
    }
    expect(screen.getByText(long.action).className).toContain("wrap-anywhere");
  });
});
