// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4 and §13). HeaderTransparent's tests,
// in Testing Library and happy-dom: the checks all six headers share (`describeHeader`) and what the
// transparent header alone does. The server draws the transparent look and the first render in
// the browser draws the same (hydration finds no mismatch); the browser then reads the scroll
// position and the open menus, and the header turns solid once the page scrolls or a menu or the
// drawer opens. `solid` pins the look for the design system and for a page with no hero.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  describeHeader,
  header,
  headerProps,
  logos,
  menuButton,
  navigationLandmark,
  slot,
} from "../../test-support/header-suite";
import { HeaderTransparent, type HeaderTransparentProps } from "./transparent";
import { SCROLL_THRESHOLD } from "./transparent-client";

vi.mock("next/link", async () =>
  (await import("../../test-support/next-link-stand-in")).nextLinkStandIn(),
);

describeHeader({
  name: "HeaderTransparent",
  variant: "transparent",
  Header: HeaderTransparent,
  navigation: true,
  utilities: "all",
  switcher: "row",
});

const props = (over: Partial<HeaderTransparentProps> = {}): HeaderTransparentProps => ({
  ...headerProps(),
  ...over,
});
const solid = () => header().getAttribute("data-solid");

/** Puts the page `y` px down, and tells the header's scroll listener. */
function scrollTo(y: number) {
  vi.spyOn(window, "scrollY", "get").mockReturnValue(y);
  fireEvent.scroll(window);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HeaderTransparent: its look", () => {
  it("has no height of its own: the surface hangs from it over what follows", () => {
    render(<HeaderTransparent {...props()} />);
    expect(header().className).toContain("h-0");
    const surface = slot("header-surface") as HTMLElement;
    expect(header().contains(surface)).toBe(true);
    expect(surface.className).toContain("absolute");
    expect(surface.className).toContain("inset-x-0");
    expect(surface.className).toContain("top-0");
  });

  it("is the transparent look at first: light text on a scrim the reader's screen reader skips", () => {
    render(<HeaderTransparent {...props()} />);
    expect(solid()).toBe("false");
    const scrim = slot("header-scrim") as HTMLElement;
    expect(scrim.getAttribute("aria-hidden")).toBe("true");
    expect(scrim.className).toContain("bg-overlay");
    expect(scrim.className).toContain("group-data-[solid=true]/header:hidden");
    const surface = slot("header-surface") as HTMLElement;
    expect(surface.className).toContain("group-data-[solid=false]/header:text-overlay-foreground");
    expect(surface.className).toContain("group-data-[solid=true]/header:bg-background");
    expect(surface.className).toContain("group-data-[solid=true]/header:border-b");
  });

  it("remaps the tokens of everything inside it, so a component keeps its own contrast pairing", () => {
    render(<HeaderTransparent {...props()} />);
    const surface = slot("header-surface") as HTMLElement;
    for (const token of ["--foreground", "--muted-foreground", "--muted", "--ring"]) {
      expect(surface.className).toContain(`group-data-[solid=false]/header:[${token}:var(`);
    }
  });

  it("sticks, with the row hanging from it, when `sticky`, and is relative otherwise", () => {
    const { unmount } = render(<HeaderTransparent {...props({ sticky: true })} />);
    expect(header().className).toContain("sticky");
    expect(header().className).toContain("top-0");
    unmount();
    render(<HeaderTransparent {...props({ sticky: false })} />);
    expect(header().className).toContain("relative");
    expect(header().className).not.toContain("sticky");
  });

  it("has one of everything the classic header has: a logo, a navigation, a cart", () => {
    render(<HeaderTransparent {...props()} />);
    expect(logos()).toHaveLength(1);
    expect(navigationLandmark()).not.toBeNull();
    expect(screen.getAllByRole("link", { name: "Cart" })).toHaveLength(1);
  });
});

describe("HeaderTransparent: solid once the page has scrolled", () => {
  it("turns solid past the threshold and transparent again at the top", () => {
    render(<HeaderTransparent {...props()} />);
    expect(solid()).toBe("false");
    scrollTo(SCROLL_THRESHOLD);
    expect(solid()).toBe("false");
    scrollTo(SCROLL_THRESHOLD + 1);
    expect(solid()).toBe("true");
    scrollTo(0);
    expect(solid()).toBe("false");
  });

  it("stops listening when it leaves the page", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<HeaderTransparent {...props()} />);
    unmount();
    expect(remove.mock.calls.some(([type]) => type === "scroll")).toBe(true);
  });

  it("is solid at once when the page is already scrolled when it arrives", () => {
    vi.spyOn(window, "scrollY", "get").mockReturnValue(400);
    render(<HeaderTransparent {...props()} />);
    expect(solid()).toBe("true");
  });

  it("is solid whatever the page does when `solid` is true", () => {
    render(<HeaderTransparent {...props({ solid: true })} />);
    expect(solid()).toBe("true");
    scrollTo(0);
    expect(solid()).toBe("true");
  });

  it("takes its row's height when pinned solid, so a page with no hero is not covered (PR 57 review)", () => {
    const { container } = render(<HeaderTransparent {...props({ solid: true })} />);
    expect(header().className).not.toContain("h-0");
    expect(header().getAttribute("data-pinned")).toBe("solid");
    const surface = container.querySelector("[data-slot=header-surface]") as HTMLElement;
    expect(surface.className).toContain("group-data-[pinned=solid]/header:relative");
  });

  it("lies over the page, with no height, when it only turns solid", () => {
    render(<HeaderTransparent {...props()} />);
    scrollTo(500);
    expect(solid()).toBe("true");
    expect(header().className).toContain("h-0");
    expect(header().hasAttribute("data-pinned")).toBe(false);
  });

  it("is transparent whatever the page does when `solid` is false", async () => {
    render(<HeaderTransparent {...props({ solid: false })} />);
    scrollTo(500);
    expect(solid()).toBe("false");
    await userEvent.setup().click(menuButton() as HTMLButtonElement);
    await waitFor(() => expect(menuButton()?.getAttribute("aria-expanded")).toBe("true"));
    expect(solid()).toBe("false");
  });
});

describe("HeaderTransparent: solid while something is open", () => {
  it("turns solid when the drawer opens, and transparent when it closes", async () => {
    render(<HeaderTransparent {...props()} />);
    const user = userEvent.setup();
    expect(solid()).toBe("false");
    await user.click(menuButton() as HTMLButtonElement);
    await waitFor(() => expect(solid()).toBe("true"));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(solid()).toBe("false"));
  });

  it("turns solid when anything in the header says it is expanded", async () => {
    render(<HeaderTransparent {...props()} />);
    const trigger = header().querySelector("[aria-expanded]") as HTMLElement;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    act(() => trigger.setAttribute("aria-expanded", "true"));
    await waitFor(() => expect(solid()).toBe("true"));
    act(() => trigger.setAttribute("aria-expanded", "false"));
    await waitFor(() => expect(solid()).toBe("false"));
  });

  it("is solid while a panel the design system drew open is open", async () => {
    render(<HeaderTransparent {...props({ drawn: { panel: 1 } })} />);
    await waitFor(() => expect(solid()).toBe("true"));
  });
});

describe("HeaderTransparent: the server and the browser", () => {
  it("renders the transparent look on the server, whatever the page does", () => {
    vi.spyOn(window, "scrollY", "get").mockReturnValue(900);
    const markup = renderToString(<HeaderTransparent {...props()} />);
    expect(markup).toContain('data-solid="false"');
    expect(markup).toContain('data-slot="header-scrim"');
  });

  it("renders a pinned look on the server as it is pinned", () => {
    expect(renderToString(<HeaderTransparent {...props({ solid: true })} />)).toContain(
      'data-solid="true"',
    );
  });

  async function hydrate(element: React.ReactElement) {
    const container = document.createElement("div");
    document.body.append(container);
    container.innerHTML = renderToString(element);
    const onRecoverableError = vi.fn();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => {
      hydrateRoot(container, element, { onRecoverableError });
    });
    return { container, onRecoverableError, error };
  }

  it("hydrates the server's markup with no mismatch, at the top of the page", async () => {
    const { container, onRecoverableError, error } = await hydrate(
      <HeaderTransparent {...props()} />,
    );
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(solid()).toBe("false");
    container.remove();
  });

  it("hydrates with no mismatch on a page that is already scrolled, then reads the position", async () => {
    // The server cannot know where the page is: it renders the top, and the browser's next render
    // finds the position.
    const markup = renderToString(<HeaderTransparent {...props()} />);
    vi.spyOn(window, "scrollY", "get").mockReturnValue(300);
    const container = document.createElement("div");
    document.body.append(container);
    container.innerHTML = markup;
    const onRecoverableError = vi.fn();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => {
      hydrateRoot(container, <HeaderTransparent {...props()} />, { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(solid()).toBe("true");
    container.remove();
  });

  it("hydrates a pinned look with no mismatch", async () => {
    const { container, onRecoverableError, error } = await hydrate(
      <HeaderTransparent {...props({ solid: false })} />,
    );
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(solid()).toBe("false");
    container.remove();
  });
});
