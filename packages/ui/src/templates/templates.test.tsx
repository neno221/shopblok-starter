// Ours (T48, SETUP.md "The shell (T48)"). The not-found and the error templates, in Testing Library
// and happy-dom: the page's one `<main>` and `<h1>`, the words in each language, and the ways on.
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorTemplate } from "./error";
import { NotFoundTemplate } from "./not-found";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);

describe("NotFoundTemplate", () => {
  it.each(LOCALES)("is the page's main and its one heading, in %s", (locale) => {
    const copy = catalogs[locale].templates.notFound;
    render(<NotFoundTemplate homeHref="/" searchHref="/search" copy={copy} prefetch={false} />);
    const main = screen.getByRole("main");
    expect(main.id).toBe("main");
    expect(main.getAttribute("data-slot")).toBe("not-found-template");
    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(copy.title);
    expect(main.textContent).toContain(copy.body);
    expect(screen.getByRole("link", { name: copy.home }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: copy.search }).getAttribute("href")).toBe("/search");
  });

  it("has the home page first, as the primary button, and no search link without a search page", () => {
    const copy = catalogs.en.templates.notFound;
    const { unmount } = render(
      <NotFoundTemplate homeHref="/us" searchHref="/us/search" copy={copy} prefetch={false} />,
    );
    const home = slot("not-found-home") as HTMLElement;
    const search = slot("not-found-search") as HTMLElement;
    expect(home.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(home.className).toContain("bg-primary");
    expect(search.className).not.toContain("bg-primary");
    unmount();
    render(<NotFoundTemplate homeHref="/us" copy={copy} prefetch={false} />);
    expect(slot("not-found-search")).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("is a div with the given id where the page has its main already, and passes prefetch on", () => {
    render(
      <NotFoundTemplate
        homeHref="/"
        copy={catalogs.en.templates.notFound}
        as="div"
        mainId="ds-main"
        prefetch={false}
      />,
    );
    expect(screen.queryByRole("main")).toBeNull();
    const page = slot("not-found-template") as HTMLElement;
    expect(page.tagName).toBe("DIV");
    expect(page.id).toBe("ds-main");
    expect(slot("not-found-home")?.getAttribute("data-prefetch")).toBe("false");
  });

  it("hides its icon from assistive technology, and is no alert", () => {
    render(<NotFoundTemplate homeHref="/" copy={catalogs.en.templates.notFound} />);
    expect(screen.queryByRole("alert")).toBeNull();
    const icon = screen.getByRole("main").querySelector("svg");
    expect(icon?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe("ErrorTemplate", () => {
  it.each(LOCALES)("is the page's main and its one heading, in %s", (locale) => {
    const copy = catalogs[locale].templates.error;
    render(<ErrorTemplate homeHref="/de" copy={copy} retry={<button>{copy.retry}</button>} />);
    const main = screen.getByRole("main");
    expect(main.id).toBe("main");
    expect(main.getAttribute("data-slot")).toBe("error-template");
    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(copy.title);
    expect(main.textContent).toContain(copy.body);
    expect(screen.getByRole("link", { name: copy.home }).getAttribute("href")).toBe("/de");
  });

  it("says its heading and sentence as an alert, and not its buttons", () => {
    const copy = catalogs.en.templates.error;
    render(<ErrorTemplate homeHref="/" copy={copy} retry={<button>{copy.retry}</button>} />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe(`${copy.title}${copy.body}`);
  });

  it("puts the retry first and makes home the outline button; without a retry, home is primary", () => {
    const copy = catalogs.en.templates.error;
    const { unmount } = render(
      <ErrorTemplate homeHref="/" copy={copy} retry={<button>{copy.retry}</button>} />,
    );
    const retry = screen.getByRole("button", { name: copy.retry });
    const home = slot("error-home") as HTMLElement;
    expect(retry.compareDocumentPosition(home) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(home.className).not.toContain("bg-primary");
    unmount();
    render(<ErrorTemplate homeHref="/" copy={copy} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(slot("error-home")?.className).toContain("bg-primary");
  });
});
