import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CartLineQuantity, type CartLineQuantityProps } from "./cart-line-quantity";

const base: CartLineQuantityProps = {
  name: "quantity",
  quantity: 2,
  locale: "en-US",
  label: "Quantity, Heritage Hoodie",
  decrementLabel: "Decrease quantity, Heritage Hoodie",
  incrementLabel: "Increase quantity, Heritage Hoodie",
};

/** The component in the form it sits in: a test reads `onSubmit` to see when the form was sent. */
function setup(props: Partial<CartLineQuantityProps> = {}) {
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  const tree = (next: Partial<CartLineQuantityProps>) => (
    <form onSubmit={onSubmit}>
      <CartLineQuantity {...base} {...next} />
    </form>
  );
  const view = render(tree(props));
  return {
    ...view,
    onSubmit,
    again: (next: Partial<CartLineQuantityProps>) => view.rerender(tree(next)),
  };
}

const field = () => screen.getByRole("textbox", { name: base.label }) as HTMLInputElement;
const plus = () => screen.getByRole("button", { name: base.incrementLabel });
const minus = () => screen.getByRole("button", { name: base.decrementLabel });
/** What the form would post: the stepper's hidden number input, named `quantity`. */
const posted = (container: HTMLElement) =>
  (container.querySelector('input[name="quantity"]') as HTMLInputElement).value;
const isDisabled = (element: HTMLElement) =>
  element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";

/** A press of a stepper button with a pointer: down, then up. */
function press(button: HTMLElement) {
  fireEvent.pointerDown(button, { pointerType: "mouse", button: 0, pointerId: 1 });
  fireEvent.pointerUp(button, { pointerType: "mouse", button: 0, pointerId: 1 });
}
/** Types a number into the field, as a shopper does: focus, then the new text. */
function type(value: string) {
  act(() => field().focus());
  fireEvent.change(field(), { target: { value } });
}
const key = (name: string) => fireEvent.keyDown(field(), { key: name });
/** The time passes inside `act`, as React's timers do in a browser. */
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

// The clock is a fake one, so that a test can wait half a second; the events are `fireEvent`'s,
// which are synchronous (user-event waits on timers too).
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("CartLineQuantity", () => {
  describe("structure", () => {
    it("is the stepper, named for the line, holding the cart's quantity", () => {
      const { container } = setup();
      expect(field().value).toBe("2");
      expect(minus()).toBeTruthy();
      expect(plus()).toBeTruthy();
      // The form carries the quantity under the given name, in an input the browser can post.
      const hidden = container.querySelector<HTMLInputElement>('input[name="quantity"]');
      expect(hidden?.type).toBe("number");
      expect(hidden?.value).toBe("2");
    });

    it("is disabled for a line that cannot be bought", () => {
      setup({ disabled: true });
      expect(field().disabled).toBe(true);
    });

    it("stops at the stock limit", () => {
      const { container, onSubmit } = setup({ quantity: 3, max: 3 });
      press(plus());
      expect(field().value).toBe("3");
      expect(posted(container)).toBe("3");
      expect(isDisabled(plus())).toBe(true);
      wait(2000);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("stops at one: the line is removed by its own button", () => {
      const { onSubmit } = setup({ quantity: 1 });
      expect(isDisabled(minus())).toBe(true);
      press(minus());
      expect(field().value).toBe("1");
      wait(2000);
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("sending the form", () => {
    it("sends it half a second after a change, and not before", () => {
      const { onSubmit, container } = setup();
      press(plus());
      expect(field().value).toBe("3");
      expect(onSubmit).not.toHaveBeenCalled();
      wait(499);
      expect(onSubmit).not.toHaveBeenCalled();
      wait(1);
      expect(onSubmit).toHaveBeenCalledTimes(1);
      // The form carries the new quantity when it goes.
      expect(posted(container)).toBe("3");
    });

    it("sends the form once for a press on minus too", () => {
      const { onSubmit, container } = setup({ quantity: 4 });
      press(minus());
      wait(500);
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(posted(container)).toBe("3");
    });

    it("sends three presses on plus as one request, with the last quantity", () => {
      const { onSubmit, container } = setup();
      press(plus());
      wait(300);
      press(plus());
      wait(300);
      press(plus());
      expect(onSubmit).not.toHaveBeenCalled();
      wait(499);
      expect(onSubmit).not.toHaveBeenCalled();
      wait(1);
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(posted(container)).toBe("5");
    });

    it("sends at once on Enter in the field, and not a second time when the timer runs out", () => {
      const { onSubmit, container } = setup();
      type("4");
      expect(onSubmit).not.toHaveBeenCalled();
      key("Enter");
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(posted(container)).toBe("4");
      wait(2000);
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("sends what was typed when the field is left, after the same wait", () => {
      const { onSubmit, container } = setup();
      type("6");
      fireEvent.blur(field());
      expect(field().value).toBe("6");
      wait(499);
      expect(onSubmit).not.toHaveBeenCalled();
      wait(1);
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(posted(container)).toBe("6");
    });

    it("steps with the arrow keys, and sends once for the keys in a row", () => {
      const { onSubmit, container } = setup();
      act(() => field().focus());
      key("ArrowUp");
      key("ArrowUp");
      expect(field().value).toBe("4");
      wait(500);
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(posted(container)).toBe("4");
    });

    it("sends nothing when the quantity is the cart's own", () => {
      const { onSubmit } = setup();
      press(plus());
      press(minus());
      expect(field().value).toBe("2");
      wait(2000);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("sends nothing after it is removed from the page", () => {
      const { onSubmit, unmount } = setup();
      press(plus());
      unmount();
      wait(2000);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("brings the cart's quantity back when the field is left empty, and sends nothing", () => {
      const { onSubmit } = setup({ quantity: 4 });
      type("");
      fireEvent.blur(field());
      expect(field().value).toBe("4");
      wait(2000);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("does nothing on Enter in an empty field, and brings the quantity back when it is left", () => {
      const { onSubmit } = setup({ quantity: 4 });
      type("");
      key("Enter");
      wait(2000);
      expect(onSubmit).not.toHaveBeenCalled();
      // The field shows what the shopper left it as until it is left (Base UI does not rewrite
      // text that is being typed), and the form would post nothing but what is in it.
      fireEvent.blur(field());
      expect(field().value).toBe("4");
      wait(2000);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("sends once for a key and Enter after it, not twice", () => {
      // The form has no submit button, so Enter would submit it implicitly, as it does a form
      // with one text field; the component handles the key and sends the form itself.
      const { onSubmit } = setup();
      act(() => field().focus());
      key("ArrowUp");
      key("Enter");
      wait(2000);
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("prevents the browser's own submit on Enter", () => {
      setup();
      act(() => field().focus());
      const notPrevented = fireEvent.keyDown(field(), { key: "Enter", cancelable: true });
      expect(notPrevented).toBe(false);
    });

    it("leaves the other keys the field uses alone", () => {
      setup();
      act(() => field().focus());
      for (const name of ["Tab", "ArrowLeft", "Backspace"])
        expect(fireEvent.keyDown(field(), { key: name, cancelable: true }), name).toBe(true);
    });
  });

  describe("while the cart is updating", () => {
    it("is read-only and keeps its value and its focus", () => {
      setup({ pending: true });
      expect(field().readOnly).toBe(true);
      expect(field().disabled).toBe(false);
      act(() => field().focus());
      expect(document.activeElement).toBe(field());
      expect(field().value).toBe("2");
      expect(isDisabled(plus())).toBe(true);
      expect(isDisabled(minus())).toBe(true);
    });

    it("sends nothing on a press, a key or Enter", () => {
      const { onSubmit } = setup({ pending: true });
      press(plus());
      press(minus());
      act(() => field().focus());
      key("ArrowUp");
      key("Enter");
      wait(2000);
      expect(onSubmit).not.toHaveBeenCalled();
      expect(field().value).toBe("2");
    });

    it("sends nothing for a typed number either", () => {
      const { onSubmit } = setup({ pending: true });
      type("7");
      fireEvent.blur(field());
      key("Enter");
      wait(2000);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("drops a change still waiting when an update begins (PR 56 review)", () => {
      const { onSubmit, again } = setup();
      press(plus());
      again({ pending: true });
      wait(2000);
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("following the cart", () => {
    it("shows the cart's quantity when it changes", () => {
      const { again } = setup({ quantity: 2 });
      again({ quantity: 5 });
      expect(field().value).toBe("5");
    });

    it("keeps what the shopper chose while the cart has not answered", () => {
      const { again } = setup({ quantity: 2 });
      press(plus());
      // A rerender with the same props, as when the page around it rerenders.
      again({ quantity: 2 });
      expect(field().value).toBe("3");
    });

    it("goes back to the cart's quantity when an update ends with the quantity unchanged", () => {
      // The shopper chose 3, the cart updated and refused (the stock): it still holds 2.
      const { again, container } = setup({ quantity: 2 });
      press(plus());
      again({ quantity: 2, pending: true });
      expect(field().value).toBe("3");
      again({ quantity: 2, pending: false });
      expect(field().value).toBe("2");
      expect(posted(container)).toBe("2");
    });

    it("follows the cart when an update ends with a new quantity", () => {
      const { again } = setup({ quantity: 2 });
      press(plus());
      again({ quantity: 2, pending: true });
      again({ quantity: 3, pending: false });
      expect(field().value).toBe("3");
    });

    it("lets the shopper change it again after an update", () => {
      const { again, onSubmit } = setup({ quantity: 2 });
      press(plus());
      wait(500);
      expect(onSubmit).toHaveBeenCalledTimes(1);
      again({ quantity: 2, pending: true });
      again({ quantity: 3, pending: false });
      press(plus());
      wait(500);
      expect(field().value).toBe("4");
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });
  });
});
