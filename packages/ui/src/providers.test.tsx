import { useDirection } from "@base-ui/react/direction-provider";
import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Tooltip, TooltipContent, TooltipTrigger } from "./atoms/tooltip";
import { toast } from "./primitives/toast";
import { Providers } from "./providers";

const copy = { toastRegion: "Benachrichtigungen", toastClose: "Benachrichtigung schließen" };

afterEach(() => {
  act(() => toast.close());
});

function Direction() {
  return <p>{useDirection()}</p>;
}

describe("Providers (T31, D47)", () => {
  it("renders the page, and the toasts' region named in the page's language", async () => {
    render(
      <Providers copy={copy}>
        <p>Seite</p>
      </Providers>,
    );
    expect(screen.getByText("Seite")).toBeTruthy();
    expect(await screen.findByRole("region", { name: "Benachrichtigungen" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Notifications" })).toBeNull();
  });

  it("shows a toast that any client component adds, with its close button named by the copy", async () => {
    render(
      <Providers copy={copy}>
        <p>Seite</p>
      </Providers>,
    );
    act(() => {
      toast.add({ title: "In den Warenkorb gelegt", timeout: 0 });
    });
    expect(await screen.findByText("In den Warenkorb gelegt")).toBeTruthy();
    const close = document.querySelector("[data-slot=toast-close]");
    expect(close?.getAttribute("aria-label")).toBe("Benachrichtigung schließen");
  });

  it("gives a tooltip its provider, so a story needs none of its own", async () => {
    const user = userEvent.setup();
    render(
      <Providers copy={copy}>
        <Tooltip>
          <TooltipTrigger>Merken</TooltipTrigger>
          <TooltipContent>Auf die Wunschliste</TooltipContent>
        </Tooltip>
      </Providers>,
    );
    await user.tab();
    expect(await screen.findByText("Auf die Wunschliste")).toBeTruthy();
  });

  it("sets Base UI's direction: ltr unless the page says rtl", () => {
    const { unmount } = render(
      <Providers copy={copy}>
        <Direction />
      </Providers>,
    );
    expect(screen.getByText("ltr")).toBeTruthy();
    unmount();
    render(
      <Providers copy={copy} dir="rtl">
        <Direction />
      </Providers>,
    );
    expect(screen.getByText("rtl")).toBeTruthy();
  });
});
