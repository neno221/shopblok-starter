import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import type { ToastMessage } from "@shopblok/registry/contracts";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { Toaster, createToastManager, toast } from "../primitives/toast";
import { Toast, showToast, toastTimeouts, type ToastManager } from "./toast";

const copy = catalogs.en.molecules.toast;
const kinds = ["success", "error", "info"] as const;

afterEach(() => {
  act(() => toast.close());
});

/** The words of a message, with the fixtures' toasts as the model. */
const message = (
  kind: (typeof kinds)[number],
  extra: Partial<ToastMessage> = {},
): ToastMessage => ({
  kind,
  title: `The ${kind} toast`,
  ...extra,
});

/** A manager that records what it is asked, for the arguments `showToast` builds. */
function fakeManager() {
  const add = vi.fn((_options: unknown) => "toast-1");
  const close = vi.fn();
  return { manager: { add, close } as unknown as ToastManager, add, close };
}

const addedWith = (add: ReturnType<typeof fakeManager>["add"]) =>
  add.mock.calls[0]?.[0] as Record<string, unknown> & {
    actionProps?: { children: string; onClick: () => void };
    data: { kindLabel: string };
  };

describe("Toast (one toast drawn)", () => {
  it.each(kinds)(
    "draws a %s toast with its icon and its kind in words, not the icon alone",
    (kind) => {
      const { container } = render(<Toast {...message(kind)} copy={copy} />);
      const card = container.querySelector("[data-slot=toast-card]");
      expect(card?.getAttribute("data-kind")).toBe(kind);
      // The kind is text, in the catalog's words.
      expect(within(card as HTMLElement).getByText(copy.kinds[kind])).toBeTruthy();
      expect(card?.querySelector("[data-slot=toast-kind]")?.textContent).toBe(copy.kinds[kind]);
      // The icon is a drawing that assistive technology skips.
      const icon = card?.querySelector("[data-slot=toast-icon] svg");
      expect(icon).not.toBeNull();
      expect(icon?.getAttribute("aria-hidden")).toBe("true");
    },
  );

  it.each([
    ["success", "text-success"],
    ["error", "text-destructive"],
    ["info", "text-info"],
  ] as const)("colours the %s icon with the token %s", (kind, token) => {
    const { container } = render(<Toast {...message(kind)} copy={copy} />);
    expect(container.querySelector("[data-slot=toast-icon] svg")?.getAttribute("class")).toContain(
      token,
    );
  });

  it("draws a different icon for each kind", () => {
    const drawings = kinds.map((kind) => {
      const { container, unmount } = render(<Toast {...message(kind)} copy={copy} />);
      const html = container.querySelector("[data-slot=toast-icon] svg")?.innerHTML;
      unmount();
      return html;
    });
    expect(new Set(drawings).size).toBe(3);
  });

  it("is a group named by its title, with the title and the description as text", () => {
    render(<Toast {...message("success", { description: "One item, size M." })} copy={copy} />);
    const group = screen.getByRole("group", { name: "The success toast" });
    expect(within(group).getByText("One item, size M.")).toBeTruthy();
    expect(group.getAttribute("data-slot")).toBe("toast-card");
    // Not Base UI's toast: that one is `data-slot="toast"`, and is announced.
    expect(group.getAttribute("aria-live")).toBeNull();
  });

  it("draws no description, no action when it has none", () => {
    const { container } = render(<Toast {...message("info")} copy={copy} />);
    expect(container.querySelector("[data-slot=toast-card-description]")).toBeNull();
    expect(container.querySelector("[data-slot=toast-card-action]")).toBeNull();
    // The close button is always there.
    expect(screen.getByRole("button", { name: copy.close })).toBeTruthy();
  });

  it("draws the action as a button with the message's label, and runs its handler", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <Toast {...message("success", { actionLabel: "Undo" })} copy={copy} onAction={onAction} />,
    );
    const action = screen.getByRole("button", { name: "Undo" });
    expect(action.getAttribute("data-slot")).toBe("toast-card-action");
    await user.click(action);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("closes through the close button, named in the catalog's words", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Toast {...message("error")} copy={copy} onClose={onClose} />);
    const close = screen.getByRole("button", { name: copy.close });
    expect(close.getAttribute("data-slot")).toBe("toast-card-close");
    expect(close.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    await user.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("reaches both buttons in the order the words read: the action, then the close button", async () => {
    const user = userEvent.setup();
    render(<Toast {...message("success", { actionLabel: "Undo" })} copy={copy} />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Undo" }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: copy.close }));
  });

  it("has 44 px buttons and the focus ring at full strength", () => {
    render(<Toast {...message("success", { actionLabel: "Undo" })} copy={copy} />);
    const action = screen.getByRole("button", { name: "Undo" });
    const close = screen.getByRole("button", { name: copy.close });
    expect(action.className).toContain("min-h-11");
    expect(close.className).toContain("size-11");
    for (const button of [action, close]) {
      expect(button.className).toContain("focus-visible:ring-ring");
      expect(button.className).not.toContain("ring-ring/");
    }
  });

  it("puts the action under the text and the close button at the first row's end, as the list does", () => {
    const { container } = render(
      <Toast {...message("success", { actionLabel: "Undo" })} copy={copy} />,
    );
    expect(container.firstElementChild?.className).toContain("grid");
    expect(screen.getByRole("button", { name: "Undo" }).className).toContain("row-start-2");
    expect(screen.getByRole("button", { name: copy.close }).className).toContain("row-start-1");
  });

  it("takes the caller's class and attributes", () => {
    const { container } = render(
      <Toast {...message("info")} copy={copy} className="max-w-xs" id="sample" />,
    );
    expect(container.firstElementChild?.className).toContain("max-w-xs");
    expect(container.firstElementChild?.id).toBe("sample");
  });

  it("needs a kind, a title and the copy (a type error, checked by tsc)", () => {
    const noKind = (
      // @ts-expect-error -- `kind` is required.
      <Toast title="Saved" copy={copy} />
    );
    const noCopy = (
      // @ts-expect-error -- `copy` is required.
      <Toast kind="success" title="Saved" />
    );
    const badKind = (
      // @ts-expect-error -- a kind is success, error or info.
      <Toast kind="warning" title="Saved" copy={copy} />
    );
    const fine = <Toast kind="success" title="Saved" copy={copy} />;
    expect([noKind, noCopy, badKind, fine]).toHaveLength(4);
  });
});

describe.each(LOCALES)("Toast, the fixtures' toasts in %s", (locale: Locale) => {
  const words = catalogs[locale].molecules.toast;
  const { toasts } = commerceFixtures[locale].site;

  it.each(["success", "error", "info"] as const)(
    "draws the %s sample with its kind in %s's words",
    (kind) => {
      const sample = toasts[kind];
      render(<Toast {...sample.message} copy={words} />);
      expect(screen.getByText(words.kinds[kind])).toBeTruthy();
      expect(screen.getByRole("group", { name: sample.message.title })).toBeTruthy();
      expect(screen.getByRole("button", { name: words.close })).toBeTruthy();
      if (sample.message.actionLabel !== undefined) {
        expect(screen.getByRole("button", { name: sample.message.actionLabel })).toBeTruthy();
      }
    },
  );

  it("wraps the long sample's title, description and action instead of cutting them", () => {
    const sample = toasts.long.message;
    const { container } = render(<Toast {...sample} copy={words} />);
    const title = container.querySelector("[data-slot=toast-card-title]");
    const description = container.querySelector("[data-slot=toast-card-description]");
    expect(title?.className).toContain("wrap-anywhere");
    expect(description?.className).toContain("wrap-anywhere");
    for (const each of [
      title,
      description,
      container.querySelector("[data-slot=toast-card-action]"),
    ]) {
      expect(each?.className ?? "").not.toMatch(CLIPPING_CLASSES);
    }
  });

  it("uses a kind label for each kind that differs from the other two", () => {
    expect(new Set(Object.values(words.kinds)).size).toBe(3);
  });
});

describe.each(longLabels)("Toast, a long %s label", (_locale, strings) => {
  it("wraps a long title and action", () => {
    const { container } = render(
      <Toast
        kind="error"
        title={strings.productDescription}
        description={strings.helpText}
        actionLabel={strings.action}
        copy={copy}
      />,
    );
    for (const slot of ["title", "description", "action"]) {
      expect(
        container.querySelector(`[data-slot=toast-card-${slot}]`)?.className ?? "",
      ).not.toMatch(CLIPPING_CLASSES);
    }
    expect(screen.getByRole("button", { name: strings.action })).toBeTruthy();
  });
});

describe("showToast", () => {
  describe("what it asks the manager for", () => {
    it.each(kinds)("maps kind %s to Base UI's type, and keeps the title", (kind) => {
      const { manager, add } = fakeManager();
      showToast(manager, message(kind), copy);
      const options = addedWith(add);
      expect(options.type).toBe(kind);
      expect(options.title).toBe(`The ${kind} toast`);
      expect(options.description).toBeUndefined();
      expect(options.actionProps).toBeUndefined();
    });

    it("takes the kind's words from the catalog into data.kindLabel", () => {
      for (const locale of LOCALES) {
        const { manager, add } = fakeManager();
        showToast(manager, message("error"), catalogs[locale].molecules.toast);
        expect(addedWith(add).data.kindLabel).toBe(catalogs[locale].molecules.toast.kinds.error);
      }
    });

    it("returns the id the manager gave", () => {
      const { manager } = fakeManager();
      expect(showToast(manager, message("info"), copy)).toBe("toast-1");
    });

    it("announces politely: no kind is `priority: high`, an error included", () => {
      for (const kind of kinds) {
        const { manager, add } = fakeManager();
        showToast(manager, message(kind, { description: "Why." }), copy);
        expect(addedWith(add).priority).toBeUndefined();
      }
    });

    it("lets a success and an information go after 5 s, 10 s with an action, and keeps an error", () => {
      const timeout = (kind: (typeof kinds)[number], actionLabel?: string) => {
        const { manager, add } = fakeManager();
        showToast(manager, message(kind, actionLabel === undefined ? {} : { actionLabel }), copy);
        return addedWith(add).timeout;
      };
      expect(timeout("success")).toBe(toastTimeouts.ordinary);
      expect(timeout("info")).toBe(5000);
      expect(timeout("success", "Undo")).toBe(toastTimeouts.withAction);
      expect(timeout("info", "Show")).toBe(10000);
      expect(timeout("error")).toBe(0);
      expect(timeout("error", "Retry")).toBe(0);
    });

    it("takes the caller's timeout over its own", () => {
      const { manager, add } = fakeManager();
      showToast(manager, message("error"), copy, { timeout: 1234 });
      expect(addedWith(add).timeout).toBe(1234);
      const again = fakeManager();
      showToast(again.manager, message("success"), copy, { timeout: 0 });
      expect(addedWith(again.add).timeout).toBe(0);
    });

    it("gives the action button the message's label, and closes the toast after the handler ran", () => {
      const { manager, add, close } = fakeManager();
      const order: string[] = [];
      const onAction = vi.fn(() => order.push("action"));
      close.mockImplementation(() => order.push("close"));
      showToast(manager, message("success", { actionLabel: "Undo" }), copy, { onAction });
      const { actionProps } = addedWith(add);
      expect(actionProps?.children).toBe("Undo");
      actionProps?.onClick();
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledWith("toast-1");
      expect(order).toEqual(["action", "close"]);
    });

    it("closes the toast after the action even when the caller gave no handler", () => {
      const { manager, add, close } = fakeManager();
      showToast(manager, message("info", { actionLabel: "Show" }), copy);
      addedWith(add).actionProps?.onClick();
      expect(close).toHaveBeenCalledWith("toast-1");
    });

    it("passes `onClose` on", () => {
      const { manager, add } = fakeManager();
      const onClose = vi.fn();
      showToast(manager, message("info"), copy, { onClose });
      expect(addedWith(add).onClose).toBe(onClose);
    });
  });

  describe("in the page, on the Toaster", () => {
    function Page({ manager = toast }: { manager?: ToastManager }) {
      return (
        <Toaster
          label={catalogs.en.primitives.toast.region}
          closeLabel={catalogs.en.primitives.toast.close}
          toastManager={manager as typeof toast}
        >
          <button
            type="button"
            data-slot="toast-trigger"
            onClick={() =>
              showToast(
                manager,
                message("success", { description: "One item.", actionLabel: "Undo" }),
                copy,
                { timeout: 0 },
              )
            }
          >
            Add to cart
          </button>
        </Toaster>
      );
    }

    it("leaves focus on the button that showed it, and announces the toast in a polite region", async () => {
      const user = userEvent.setup();
      render(<Page />);
      const trigger = screen.getByRole("button", { name: "Add to cart" });
      await user.click(trigger);
      const toastRoot = await waitFor(() => {
        const found = document.querySelector("[data-slot=toast]");
        expect(found).not.toBeNull();
        return found as HTMLElement;
      });
      expect(document.activeElement).toBe(trigger);
      const region = toastRoot.closest("[aria-live]");
      expect(region?.getAttribute("aria-live")).toBe("polite");
      expect(region?.getAttribute("role")).toBe("region");
      // Not an alert: nothing interrupts the reader.
      expect(toastRoot.getAttribute("role")).toBe("dialog");
      expect(toastRoot.getAttribute("aria-hidden")).toBeNull();
      expect(document.querySelector("[role=alert]")).toBeNull();
    });

    it("draws the icon, the kind in words, the title, the description, the action and the close button", async () => {
      const user = userEvent.setup();
      render(<Page />);
      await user.click(screen.getByRole("button", { name: "Add to cart" }));
      const toastRoot = (await waitFor(() => {
        const found = document.querySelector("[data-slot=toast]");
        expect(found).not.toBeNull();
        return found;
      })) as HTMLElement;
      expect(within(toastRoot).getByText(copy.kinds.success)).toBeTruthy();
      expect(within(toastRoot).getByText("The success toast")).toBeTruthy();
      expect(within(toastRoot).getByText("One item.")).toBeTruthy();
      expect(within(toastRoot).getByRole("button", { name: "Undo" })).toBeTruthy();
      expect(toastRoot.querySelector("[data-slot=toast-icon] svg")).not.toBeNull();
      expect(toastRoot.querySelector("[data-slot=toast-close]")).not.toBeNull();
    });

    it("runs the action's handler and closes the toast", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      const manager = createToastManager();
      render(
        <Toaster label="Notifications" closeLabel="Close notification" toastManager={manager}>
          <button
            type="button"
            onClick={() =>
              showToast(manager, message("success", { actionLabel: "Undo" }), copy, {
                onAction,
                timeout: 0,
              })
            }
          >
            Show
          </button>
        </Toaster>,
      );
      await user.click(screen.getByRole("button", { name: "Show" }));
      await user.click(await screen.findByRole("button", { name: "Undo" }));
      expect(onAction).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(screen.queryByText("The success toast")).toBeNull());
    });

    it("keeps an error until it is closed, and names the close button as the catalog does", async () => {
      const user = userEvent.setup();
      const manager = createToastManager();
      render(
        <Toaster label="Notifications" closeLabel={copy.close} toastManager={manager}>
          <button type="button" onClick={() => showToast(manager, message("error"), copy)}>
            Show
          </button>
        </Toaster>,
      );
      await user.click(screen.getByRole("button", { name: "Show" }));
      await screen.findByText("The error toast");
      const close = document.querySelector<HTMLElement>("[data-slot=toast-close]");
      expect(close?.getAttribute("aria-label")).toBe(copy.close);
      // The error's kind is text beside its icon.
      expect(screen.getByText(copy.kinds.error)).toBeTruthy();
      expect(document.querySelector("[data-slot=toast-icon] svg")?.getAttribute("class")).toContain(
        "text-destructive",
      );
      await user.click(close as HTMLElement);
      await waitFor(() => expect(screen.queryByText("The error toast")).toBeNull());
    });
  });
});
