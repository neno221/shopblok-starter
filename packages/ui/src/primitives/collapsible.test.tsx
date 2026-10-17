import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Button } from "../atoms/button";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

function Example({ label = "Shipping details" }: { label?: string }) {
  return (
    <Collapsible>
      <CollapsibleTrigger>{label}</CollapsibleTrigger>
      <CollapsibleContent>Free over 50.</CollapsibleContent>
    </Collapsible>
  );
}

describe("Collapsible", () => {
  it("has a trigger at least 44 × 44 px (D32), with the ring at full strength (D35)", () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Shipping details" });
    expect(trigger.className).toContain("min-h-11");
    expect(trigger.className).toContain("min-w-11");
    expect(trigger.className).toContain("focus-visible:ring-ring");
    expect(trigger.className).not.toContain("ring-ring/");
    expect(trigger.getAttribute("data-slot")).toBe("collapsible-trigger");
  });

  it("keeps the 44 px when the trigger renders a Button", () => {
    render(
      <Collapsible>
        <CollapsibleTrigger render={<Button variant="outline" />}>More</CollapsibleTrigger>
        <CollapsibleContent>x</CollapsibleContent>
      </Collapsible>,
    );
    expect(screen.getByRole("button", { name: "More" }).className).toContain("min-h-11");
  });

  it("opens and closes with Enter and Space, and says so in aria-expanded", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    const trigger = screen.getByRole("button", { name: "Shipping details" });
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Free over 50.")).toBeNull();
    await user.keyboard("{Enter}");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Free over 50.")).toBeTruthy();
    await user.keyboard(" ");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it.each(longLabels)("takes a long %s label without clipping it", (_l, strings) => {
    render(<Example label={strings.action} />);
    const trigger = screen.getByRole("button", { name: strings.action });
    expect(trigger.className).not.toMatch(CLIPPING_CLASSES);
  });
});
