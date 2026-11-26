// @vitest-environment happy-dom
// M7 D143 (T108): the Turnstile widget in the browser (`turnstile-island.tsx`, which imports
// `turnstile-widget.ts` once it has mounted), with Cloudflare's API stood in: nothing is
// asked of Cloudflare before the form is focused or pressed; a press before the token is held and
// sent again with its button once the token is there; a press with the token goes at once and the
// widget starts again; and when the widget fails or its script does not load, a held press goes
// without a token (the server's limits decide then).
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Options = {
  sitekey: string;
  language: string;
  appearance: string;
  size: string;
  callback: (token: string) => void;
  "error-callback": () => boolean;
  "expired-callback": () => void;
  "unsupported-callback": () => void;
};

const roots: Root[] = [];
let rendered: Options[] = [];
const api = {
  render: vi.fn((_box: HTMLElement, options: Options) => {
    rendered.push(options);
    return "widget-1";
  }),
  reset: vi.fn(),
  remove: vi.fn(),
  getResponse: vi.fn(),
};

/** A fresh copy of the module, so its once-per-page script promise starts again. */
async function mount(withApi = true) {
  vi.resetModules();
  if (withApi) window.turnstile = api;
  else delete window.turnstile;
  const { TurnstileIsland } = await import("./turnstile-island");
  const form = document.body.appendChild(document.createElement("form"));
  form.innerHTML = '<input name="email"><button type="submit" name="go" value="1">Send</button>';
  const holder = form.insertBefore(document.createElement("div"), form.lastChild);
  const root = createRoot(holder);
  roots.push(root);
  await act(async () =>
    root.render(<TurnstileIsland siteKey="1x00000000000000000000AA" language="el" />),
  );
  // The widget's module is imported once the island has mounted.
  await vi.waitFor(() =>
    expect(form.querySelector("[data-slot=turnstile-box]")?.hasAttribute("data-ready")).toBe(true),
  );
  const button = form.querySelector("button") as HTMLButtonElement;
  const submit = vi.spyOn(form, "requestSubmit").mockImplementation(() => undefined);
  return { form, button, submit };
}

/** Presses the button as a browser does: a `submit` event naming it, cancelable. */
function press(form: HTMLFormElement, button: HTMLButtonElement): SubmitEvent {
  const event = new SubmitEvent("submit", { bubbles: true, cancelable: true, submitter: button });
  form.dispatchEvent(event);
  return event;
}

const settle = () => act(async () => await new Promise((resolve) => setTimeout(resolve, 0)));

beforeEach(() => {
  rendered = [];
  vi.clearAllMocks();
});

afterEach(() => {
  for (const root of roots.splice(0)) act(() => root.unmount());
  document.body.innerHTML = "";
  document.head.querySelectorAll("script").forEach((script) => script.remove());
  delete window.turnstile;
});

describe("TurnstileIsland", () => {
  it("asks nothing of Cloudflare before the form is focused, then draws the widget in the market's language", async () => {
    const { form } = await mount();
    expect(api.render).not.toHaveBeenCalled();
    form.querySelector("input")?.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    await settle();
    expect(api.render).toHaveBeenCalledTimes(1);
    expect(rendered[0]).toMatchObject({
      sitekey: "1x00000000000000000000AA",
      language: "el",
      appearance: "interaction-only",
    });
    // A second focus draws no second widget.
    form.querySelector("input")?.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    await settle();
    expect(api.render).toHaveBeenCalledTimes(1);
  });

  it("holds a press before the token and sends it again with its button once the token is there", async () => {
    const { form, button, submit } = await mount();
    const listener = vi.fn();
    form.addEventListener("submit", listener);
    const event = press(form, button);
    expect(event.defaultPrevented).toBe(true);
    // React's own listener never sees the held press.
    expect(listener).not.toHaveBeenCalled();
    await settle();
    expect(submit).not.toHaveBeenCalled();
    act(() => rendered[0]?.callback("token-1"));
    expect(submit).toHaveBeenCalledWith(button);
  });

  it("lets a press with the token through and starts the widget again", async () => {
    vi.useFakeTimers();
    try {
      const { form, button } = await mount();
      form.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      await act(async () => await Promise.resolve());
      act(() => rendered[0]?.callback("token-1"));
      const event = press(form, button);
      expect(event.defaultPrevented).toBe(false);
      vi.runAllTimers();
      expect(api.reset).toHaveBeenCalledWith("widget-1");
      // The token is spent: the next press waits for a new one.
      expect(press(form, button).defaultPrevented).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("sends a held press without a token when the widget fails", async () => {
    const { form, button, submit } = await mount();
    press(form, button);
    await settle();
    let handled: boolean | undefined;
    act(() => {
      handled = rendered[0]?.["error-callback"]();
    });
    expect(handled).toBe(true);
    expect(submit).toHaveBeenCalledWith(button);
    // Broken: the next press goes as it is.
    expect(press(form, button).defaultPrevented).toBe(false);
  });

  it("sends a held press without a token when Cloudflare's script does not load", async () => {
    const { form, button, submit } = await mount(false);
    press(form, button);
    const script = document.head.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );
    expect(script?.async).toBe(true);
    await act(async () => script?.onerror?.(new Event("error")));
    await settle();
    expect(submit).toHaveBeenCalledWith(button);
    expect(press(form, button).defaultPrevented).toBe(false);
  });

  it("removes the widget and its listeners when the form goes", async () => {
    const { form, button } = await mount();
    form.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    await settle();
    for (const root of roots.splice(0)) act(() => root.unmount());
    expect(api.remove).toHaveBeenCalledWith("widget-1");
    expect(press(form, button).defaultPrevented).toBe(false);
  });
});
