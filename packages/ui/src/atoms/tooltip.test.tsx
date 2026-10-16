import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

function Hint({ text, label = "Wishlist" }: { text: string; label?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<Button size="icon" aria-label={label} />} />
        <TooltipContent>{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

describe("Tooltip", () => {
  it("opens when its trigger takes keyboard focus, and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Hint text="Save for later" />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Wishlist" }));
    expect(await screen.findByText("Save for later")).toBeTruthy();
    await user.keyboard("{Escape}");
    await expect.poll(() => screen.queryByText("Save for later")).toBeNull();
  });

  it("opens on hover", async () => {
    const user = userEvent.setup();
    render(<Hint text="Save for later" />);
    await user.hover(screen.getByRole("button", { name: "Wishlist" }));
    expect(await screen.findByText("Save for later")).toBeTruthy();
  });

  it("takes only logical sides (a type error, checked by tsc)", () => {
    const element = (
      // @ts-expect-error -- `left` and `right` are gone: use `inline-start` and `inline-end`.
      <TooltipContent side="left">x</TooltipContent>
    );
    expect(element.props.side).toBe("left");
  });

  it.each(longLabels)("wraps a long %s text", async (_locale, strings) => {
    const user = userEvent.setup();
    render(<Hint text={strings.helpText} label={strings.action} />);
    await user.tab();
    const content = await screen.findByText(strings.helpText);
    expect(content.className).toContain("max-w-xs");
    expect(content.className).not.toContain("whitespace-nowrap");
  });
});
