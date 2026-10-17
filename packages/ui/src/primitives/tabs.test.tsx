import { DirectionProvider } from "@base-ui/react/direction-provider";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants } from "./tabs";

function Example({
  orientation,
  variant,
  label = "Description",
}: {
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "line";
  label?: string;
}) {
  return (
    <Tabs defaultValue="description" orientation={orientation}>
      <TabsList variant={variant} aria-label="Product">
        <TabsTrigger value="description">{label}</TabsTrigger>
        <TabsTrigger value="sizing">Sizing</TabsTrigger>
        <TabsTrigger value="care">Care</TabsTrigger>
      </TabsList>
      <TabsContent value="description">About this coat.</TabsContent>
      <TabsContent value="sizing">Runs small.</TabsContent>
      <TabsContent value="care">Wash cold.</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("has tabs at least 44 × 44 px (D32), with the ring at full strength (D35)", () => {
    render(<Example />);
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.className).toContain("min-h-11");
      expect(tab.className).toContain("min-w-11");
      expect(tab.className).toContain("focus-visible:ring-ring");
      expect(tab.className).not.toContain("ring-ring/");
      expect(tab.className).not.toContain("outline-1");
    }
  });

  it("has no fixed list height that a 44 px tab would overflow", () => {
    expect(tabsListVariants()).not.toMatch(/(?:^|\s|:)h-9(?:\s|$)/);
    expect(tabsListVariants({ variant: "line" })).toContain("gap-1");
  });

  it("styles orientation from Base UI's data-orientation, not the kit's data-horizontal", () => {
    render(<Example />);
    const all = [
      screen.getByRole("tablist").parentElement?.className,
      screen.getByRole("tablist").className,
      ...screen.getAllByRole("tab").map((tab) => tab.className),
    ].join(" ");
    expect(all).toContain("data-[orientation=horizontal]:flex-col");
    expect(all).toContain("group-data-[orientation=vertical]/tabs:flex-col");
    expect(all).not.toMatch(/data-horizontal|data-vertical|group-data-(?:horizontal|vertical)/);
    expect(all).not.toMatch(/dark:|-right-|\bpr-|\bpl-/);
    expect(all).toContain("group-data-[orientation=vertical]/tabs:after:-end-1");
  });

  it("passes its orientation to Base UI: aria-orientation and the arrow keys follow it", async () => {
    const user = userEvent.setup();
    render(<Example orientation="vertical" />);
    expect(screen.getByRole("tablist").getAttribute("aria-orientation")).toBe("vertical");
    await user.tab();
    const [description, sizing] = screen.getAllByRole("tab") as [HTMLElement, HTMLElement];
    expect(document.activeElement).toBe(description);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(description);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(sizing);
  });

  it("moves between tabs with the arrows and selects with Enter", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    const [description, sizing] = screen.getAllByRole("tab") as [HTMLElement, HTMLElement];
    expect(description.getAttribute("aria-selected")).toBe("true");
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(sizing);
    expect(sizing.getAttribute("aria-selected")).toBe("false");
    await user.keyboard("{Enter}");
    expect(sizing.getAttribute("aria-selected")).toBe("true");
    expect(sizing.hasAttribute("data-active")).toBe(true);
    expect(screen.getByRole("tabpanel").textContent).toBe("Runs small.");
  });

  it("moves with ArrowLeft along the reading direction in a right-to-left page", async () => {
    const user = userEvent.setup();
    render(
      <DirectionProvider direction="rtl">
        <Example />
      </DirectionProvider>,
    );
    await user.tab();
    const [description, sizing] = screen.getAllByRole("tab") as [HTMLElement, HTMLElement];
    expect(document.activeElement).toBe(description);
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(sizing);
  });

  it("gives the focusable panel a visible ring (it is a tab stop)", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const panel = screen.getByRole("tabpanel");
    expect(panel.getAttribute("tabindex")).toBe("0");
    expect(panel.className).toContain("focus-visible:ring-ring");
    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(panel);
  });

  it.each(longLabels)("wraps a long %s tab label instead of cutting it", (_l, strings) => {
    render(<Example label={strings.action} />);
    const tab = screen.getByRole("tab", { name: strings.action });
    expect(tab.className).not.toMatch(CLIPPING_CLASSES);
    expect(tab.className).toContain("text-center");
  });
});
