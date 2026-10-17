import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import {
  Stepper,
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
  useStepper,
} from "./stepper";

const source = readFileSync(path.join(import.meta.dirname, "stepper.tsx"), "utf8");

function Steps(
  props: Partial<React.ComponentProps<typeof Stepper>> & {
    titles?: [string, string, string];
    disabledStep?: number;
  },
) {
  const { titles = ["Address", "Delivery", "Payment"], disabledStep, ...rest } = props;
  return (
    <Stepper {...rest}>
      <StepperNav>
        {titles.map((title, index) => (
          <StepperItem key={title} step={index + 1} disabled={disabledStep === index + 1}>
            <StepperTrigger>
              <StepperIndicator>{index + 1}</StepperIndicator>
              <StepperTitle>{title}</StepperTitle>
            </StepperTrigger>
            {index < titles.length - 1 ? <StepperSeparator /> : null}
          </StepperItem>
        ))}
      </StepperNav>
      <StepperPanel>
        {titles.map((title, index) => (
          <StepperContent key={title} value={index + 1}>
            Panel {index + 1}
          </StepperContent>
        ))}
      </StepperPanel>
    </Stepper>
  );
}

describe("Stepper", () => {
  it("says in its header why it is a client component", () => {
    expect(source).toMatch(/^"use client";$/m);
    expect(source.split('"use client"')[0]).toMatch(/client component because/);
  });

  it("has a tab for each step, named by its title, the first one selected", () => {
    render(<Steps />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["1Address", "2Delivery", "3Payment"]);
    expect(screen.getByRole("tab", { name: /Address/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: /Delivery/ }).getAttribute("aria-selected")).toBe(
      "false",
    );
    expect(screen.getByText("Panel 1")).toBeTruthy();
    expect(screen.queryByText("Panel 2")).toBeNull();
  });

  it("makes every trigger at least 44 × 44 px (D32)", () => {
    render(<Steps />);
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.className).toContain("min-h-11");
      expect(tab.className).toContain("min-w-11");
    }
  });

  it("draws the focus ring at full strength, with no tint and no dark variant (D35)", () => {
    render(<Steps />);
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.className).toContain("focus-visible:ring-ring");
      expect(tab.className).not.toMatch(/ring-[a-z-]+\/\d/);
      expect(tab.className).not.toMatch(/(?:^|[\s:])dark:/);
    }
  });

  it("is one Tab stop at the selected step, and the arrow keys move focus on without choosing", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Steps onValueChange={onValueChange} />);
    const [address, delivery, payment] = screen.getAllByRole("tab");
    expect(address?.getAttribute("tabindex")).toBe("0");
    expect(delivery?.getAttribute("tabindex")).toBe("-1");
    await user.tab();
    expect(document.activeElement).toBe(address);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(delivery);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(payment);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(address);
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(payment);
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(address);
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(payment);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(address?.getAttribute("aria-selected")).toBe("true");
  });

  it("chooses a step with Enter, Space or a click", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Steps onValueChange={onValueChange} />);
    await user.tab();
    await user.keyboard("{ArrowRight}{Enter}");
    expect(screen.getByRole("tab", { name: /Delivery/ }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByText("Panel 2")).toBeTruthy();
    await user.keyboard("{ArrowRight} ");
    expect(screen.getByRole("tab", { name: /Payment/ }).getAttribute("aria-selected")).toBe("true");
    await user.click(screen.getByRole("tab", { name: /Address/ }));
    expect(onValueChange.mock.calls.map(([step]) => step)).toEqual([2, 3, 1]);
  });

  it("moves with ArrowDown and ArrowUp as well, in a vertical stepper", async () => {
    const user = userEvent.setup();
    render(<Steps orientation="vertical" />);
    const [address, delivery] = screen.getAllByRole("tab");
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(delivery);
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(address);
    expect(screen.getByRole("tablist").getAttribute("aria-orientation")).toBe("vertical");
  });

  it("swaps ArrowLeft and ArrowRight in a right-to-left horizontal stepper (`dir` or Base UI's DirectionProvider)", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Steps dir="rtl" />);
    let [address, delivery] = screen.getAllByRole("tab");
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(delivery);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(address);
    unmount();

    render(
      <DirectionProvider direction="rtl">
        <Steps />
      </DirectionProvider>,
    );
    [address, delivery] = screen.getAllByRole("tab");
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(delivery);
  });

  it("skips a disabled step with the arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Steps disabledStep={2} />);
    const [first, , payment] = screen.getAllByRole("tab");
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(payment);
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(first);
    unmount();

    render(<Steps disabledStep={3} />);
    const [address] = screen.getAllByRole("tab");
    const delivery = screen.getByRole("tab", { name: /Delivery/ });
    await user.tab();
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(delivery);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(address);
  });

  it("keeps ids unique with two steppers on a page, and labels each panel by its tab", () => {
    render(
      <>
        <Steps />
        <Steps titles={["Size", "Colour", "Fit"]} />
      </>,
    );
    const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const panel of screen.getAllByRole("tabpanel")) {
      const tab = document.getElementById(panel.getAttribute("aria-labelledby") ?? "");
      expect(tab?.getAttribute("role")).toBe("tab");
      expect(tab?.getAttribute("aria-controls")).toBe(panel.id);
    }
    expect(screen.getByRole("tabpanel", { name: /Size/ }).textContent).toBe("Panel 1");
  });

  it("counts its steps however deep the items sit", () => {
    let count = 0;
    function Count() {
      count = useStepper().stepsCount;
      return null;
    }
    render(
      <Stepper>
        <StepperNav>
          <>
            {[1, 2, 3].map((step) => (
              <StepperItem key={step} step={step}>
                <StepperTrigger>{step}</StepperTrigger>
              </StepperItem>
            ))}
          </>
        </StepperNav>
        <Count />
      </Stepper>,
    );
    expect(count).toBe(3);
  });

  it("does not choose a disabled step", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Steps disabledStep={3} onValueChange={onValueChange} />);
    const payment = screen.getByRole("tab", { name: /Payment/ });
    expect(payment).toHaveProperty("disabled", true);
    await user.click(payment);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("marks the steps before the active one completed, and the active one active", () => {
    render(<Steps defaultValue={3} />);
    const states = [...document.querySelectorAll("[data-slot=stepper-item]")].map((item) =>
      item.getAttribute("data-state"),
    );
    expect(states).toEqual(["completed", "completed", "active"]);
  });

  it("uses only tokens and logical alignment in what it renders", () => {
    render(<Steps />);
    const classes = [...document.querySelectorAll("[class]")]
      .map((element) => element.getAttribute("class"))
      .join(" ");
    expect(classes).not.toMatch(/(?:^|\s)(?:text-left|[ml][lr]-\d|left-|right-)/);
    expect(classes).toContain("text-start");
  });

  it.each(longLabels)(
    "wraps a long %s title and description: leading-snug, no clipping class",
    (_locale, strings) => {
      render(
        <Stepper>
          <StepperNav>
            <StepperItem step={1}>
              <StepperTrigger>
                <StepperIndicator>1</StepperIndicator>
                <span>
                  <StepperTitle>{strings.linkLabel}</StepperTitle>
                  <StepperDescription>{strings.helpText}</StepperDescription>
                </span>
              </StepperTrigger>
            </StepperItem>
          </StepperNav>
        </Stepper>,
      );
      const title = screen.getByText(strings.linkLabel);
      expect(title.className).toContain("leading-snug");
      expect(title.className).not.toContain("leading-none");
      for (const element of document.querySelectorAll("[data-slot^=stepper]")) {
        expect(element.className).not.toMatch(CLIPPING_CLASSES);
      }
      expect(screen.getByRole("tab").className).not.toMatch(CLIPPING_CLASSES);
    },
  );
});
