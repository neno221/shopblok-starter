import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { RadioCard, type RadioCardProps } from "./radio-card";

// RadioCard is the shell the shipping and payment cards share: a native radio in a label that is
// the whole card. These tests cover what the shell promises; each card's own tests cover its words.

function Card({
  value,
  title,
  note,
  ...props
}: Partial<Omit<RadioCardProps, "labelledBy" | "describedBy" | "children" | "value">> & {
  value: string;
  title: string;
  note?: string;
}) {
  return (
    <RadioCard
      name="group"
      value={value}
      labelledBy={`${value}-title`}
      describedBy={note === undefined ? undefined : `${value}-note`}
      {...props}
    >
      <span id={`${value}-title`}>{title}</span>
      {note === undefined ? null : <span id={`${value}-note`}>{note}</span>}
    </RadioCard>
  );
}

function group(props: { onChange?: RadioCardProps["onChange"] } = {}) {
  return render(
    <fieldset>
      <legend>Delivery</legend>
      <Card value="a" title="Standard" note="3 days" {...props} />
      <Card value="b" title="Express" note="1 day" {...props} />
      <Card value="c" title="Pickup" disabled {...props} />
    </fieldset>,
  );
}

const radio = (name: string) => screen.getByRole("radio", { name }) as HTMLInputElement;

describe("RadioCard", () => {
  describe("structure", () => {
    it("is a native radio in a label that is the whole card", () => {
      const { container } = group();
      const input = radio("Standard");
      expect(input.tagName).toBe("INPUT");
      expect(input.type).toBe("radio");
      expect(input.name).toBe("group");
      expect(input.value).toBe("a");
      const card = input.closest("label");
      expect(card?.getAttribute("data-slot")).toBe("radio-card");
      // The label holds the input and everything the card says, and points at it.
      expect(card?.textContent).toContain("Standard");
      expect(card?.textContent).toContain("3 days");
      expect(card?.getAttribute("for")).toBe(input.id);
      // (Not `labels.length`: happy-dom counts a label that wraps its input and has `for` twice.)
      expect(input.labels?.[0]).toBe(card);
      expect(container.querySelectorAll("label")).toHaveLength(3);
    });

    it("names the radio by its main line and describes it by the rest", () => {
      group();
      // The name is the title alone, not the whole label's text.
      expect(screen.getByRole("radio", { name: "Standard", description: "3 days" })).toBeTruthy();
      expect(screen.getByRole("radio", { name: "Express", description: "1 day" })).toBeTruthy();
      // No note, no description.
      expect(radio("Pickup").hasAttribute("aria-describedby")).toBe(false);
    });

    it("is one group by name: arrow keys move the choice, Tab leaves the group", async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">Before</button>
          <fieldset>
            <legend>Delivery</legend>
            <Card value="a" title="Standard" defaultChecked />
            <Card value="b" title="Express" />
            <Card value="c" title="Pickup" />
          </fieldset>
          <button type="button">After</button>
        </>,
      );
      await user.tab();
      await user.tab();
      expect(document.activeElement).toBe(radio("Standard"));
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(radio("Express"));
      expect(radio("Express").checked).toBe(true);
      expect(radio("Standard").checked).toBe(false);
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "After" }));
    });

    it("is chosen by a press anywhere on the card, and by Space on the radio", async () => {
      const user = userEvent.setup();
      group();
      await user.click(screen.getByText("Express"));
      expect(radio("Express").checked).toBe(true);
      await user.click(screen.getByText("3 days"));
      expect(radio("Standard").checked).toBe(true);
      expect(radio("Express").checked).toBe(false);
      radio("Express").focus();
      await user.keyboard(" ");
      expect(radio("Express").checked).toBe(true);
    });

    it("gives every card an id of its own", () => {
      const { container } = group();
      const ids = [...container.querySelectorAll("[id]")].map((element) => element.id);
      expect(new Set(ids).size).toBe(ids.length);
      const inputs = [...container.querySelectorAll("input")];
      expect(new Set(inputs.map((input) => input.id)).size).toBe(3);
    });

    it("passes the label's own props on, and merges the class", () => {
      const { container } = render(
        <Card value="a" title="Standard" id="mine" data-x="1" className="max-w-sm" />,
      );
      const card = container.querySelector("label");
      expect(card?.id).toBe("mine");
      expect(card?.getAttribute("data-x")).toBe("1");
      expect(card?.className).toContain("max-w-sm");
      expect(card?.className).toContain("min-h-11");
    });
  });

  describe("the state", () => {
    it("starts chosen with defaultChecked, and the browser takes it from there", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Card value="a" title="Standard" defaultChecked />
          <Card value="b" title="Express" />
        </>,
      );
      expect(radio("Standard").checked).toBe(true);
      await user.click(radio("Express"));
      expect(radio("Express").checked).toBe(true);
      expect(radio("Standard").checked).toBe(false);
    });

    it("is controlled by `checked` with `onChange`", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <>
          <Card value="a" title="Standard" checked onChange={onChange} />
          <Card value="b" title="Express" checked={false} onChange={onChange} />
        </>,
      );
      expect(radio("Standard").checked).toBe(true);
      await user.click(radio("Express"));
      expect(onChange).toHaveBeenCalledTimes(1);
      // The caller did not change `checked`, so the browser's choice is put back.
      expect(radio("Standard").checked).toBe(true);
      expect(radio("Express").checked).toBe(false);
    });

    it("is drawn chosen with `checked` alone, with no React warning and no `readonly` (PR 56 review)", () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      render(<Card value="a" title="Standard" checked />);
      expect(radio("Standard").checked).toBe(true);
      expect(radio("Standard").hasAttribute("readonly")).toBe(false);
      expect(error).not.toHaveBeenCalled();
      error.mockRestore();
    });

    it("is not read-only otherwise", () => {
      render(<Card value="a" title="Standard" defaultChecked />);
      expect(radio("Standard").readOnly).toBe(false);
    });

    it("can be required, and the group is invalid until one is chosen", () => {
      const { container } = render(
        <form>
          <Card value="a" title="Standard" required />
          <Card value="b" title="Express" required />
        </form>,
      );
      expect(radio("Standard").required).toBe(true);
      expect(container.querySelector("form")?.checkValidity()).toBe(false);
      radio("Express").click();
      expect(container.querySelector("form")?.checkValidity()).toBe(true);
    });

    it("sends the group's name with the chosen value", () => {
      const { container } = render(
        <form>
          <Card value="a" title="Standard" />
          <Card value="b" title="Express" defaultChecked />
        </form>,
      );
      const data = new FormData(container.querySelector("form") as HTMLFormElement);
      expect(data.get("group")).toBe("b");
    });

    it("joins the form it names from outside it, on the input and not the label", () => {
      const { container } = render(
        <>
          <Card value="a" title="Standard" form="pay" />
          <Card value="b" title="Express" form="pay" defaultChecked />
          <form id="pay" />
        </>,
      );
      expect(radio("Express").getAttribute("form")).toBe("pay");
      expect(container.querySelector("label")?.hasAttribute("form")).toBe(false);
      const form = container.querySelector("form") as HTMLFormElement;
      expect(radio("Express").form).toBe(form);
      expect(new FormData(form).get("group")).toBe("b");
    });

    it("is disabled: not focusable, not chosen by a press, not sent", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <form>
          <Card value="a" title="Standard" disabled />
        </form>,
      );
      expect(radio("Standard").disabled).toBe(true);
      await user.click(screen.getByText("Standard"));
      expect(radio("Standard").checked).toBe(false);
      await user.tab();
      expect(document.activeElement).not.toBe(radio("Standard"));
      expect(new FormData(container.querySelector("form") as HTMLFormElement).has("group")).toBe(
        false,
      );
    });
  });

  describe("without JavaScript", () => {
    it("is markup a browser can submit: a label, a radio with name, value and checked", () => {
      const markup = renderToString(
        <form action="/checkout" method="post">
          <Card value="so_standard" title="Standard" defaultChecked />
          <Card value="so_express" title="Express" />
          <button type="submit">Continue</button>
        </form>,
      );
      expect(markup).toContain("<label ");
      expect(markup).toContain('type="radio"');
      expect(markup).toContain('name="group"');
      expect(markup).toContain('value="so_standard"');
      expect(markup).toContain('checked=""');
      // Only the chosen one.
      expect(markup.match(/checked=""/g)).toHaveLength(1);
      expect(markup).toContain('aria-labelledby="so_standard-title"');
    });

    it("is a server component: no client directive, no hook but useId", () => {
      const source = readFileSync(path.join(import.meta.dirname, "radio-card.tsx"), "utf8");
      expect(source).not.toMatch(/^\s*["']use client["']/m);
      const hooks = [...source.matchAll(/\buse[A-Z]\w+\(/g)].map((match) => match[0]);
      expect(new Set(hooks)).toEqual(new Set(["useId("]));
    });
  });

  describe("how it looks", () => {
    it("is at least 44 px tall, the whole label being the target (D32)", () => {
      const { container } = group();
      for (const card of container.querySelectorAll("label")) {
        expect(card.className).toContain("min-h-11");
        expect(card.className).toContain("w-full");
      }
    });

    it("hides the input visually but keeps it the focusable, announced control", () => {
      group();
      const input = radio("Standard");
      expect(input.className).toContain("sr-only");
      expect(input.hasAttribute("hidden")).toBe(false);
      expect(input.getAttribute("tabindex")).toBeNull();
      // Positioned against the card, so a focus never scrolls to the top of the page.
      expect(input.closest("label")?.className).toContain("relative");
    });

    it("draws a mark next to the input that follows its state, hidden from assistive technology", () => {
      const { container } = group();
      const input = container.querySelector("input");
      const mark = input?.nextElementSibling;
      expect(mark?.getAttribute("data-slot")).toBe("radio-card-mark");
      expect(mark?.getAttribute("aria-hidden")).toBe("true");
      // The input is a `peer`, so the mark can follow `:checked` and `:disabled`.
      expect(input?.className).toContain("peer");
      // A thick ring, not a fill: borders survive forced colors, backgrounds do not.
      expect(mark?.className).toContain("peer-checked:border-[5px]");
      expect(mark?.className).toContain("peer-checked:border-primary");
      expect(mark?.className).not.toMatch(/peer-checked:bg-/);
      expect(mark?.className).toContain("border-input");
    });

    it("draws the card's chosen and focus styles from the input's state, at full strength", () => {
      const { container } = group();
      const card = container.querySelector("label")?.className ?? "";
      expect(card).toContain("has-[:checked]:border-primary");
      expect(card).toContain("has-[:focus-visible]:ring-3");
      expect(card).toContain("has-[:focus-visible]:ring-ring");
      expect(card).not.toMatch(/ring-ring\/\d/);
      expect(card).toContain("has-[:disabled]:cursor-not-allowed");
      expect(card).toContain("has-[:disabled]:bg-muted");
      expect(card).toContain("has-[:disabled]:text-muted-foreground");
    });

    it("lets everything inside wrap", () => {
      const { container } = group();
      for (const element of container.querySelectorAll("*")) {
        expect(String(element.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
      }
      expect(container.querySelector("label")?.className).toContain("min-w-0");
    });

    it("holds phrasing content only: a label may not hold a div", () => {
      const { container } = group();
      expect(
        container.querySelectorAll("label div, label p, label h1, label h2, label h3"),
      ).toHaveLength(0);
    });
  });
});
