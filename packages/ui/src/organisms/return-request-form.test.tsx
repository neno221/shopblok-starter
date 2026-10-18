// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"). ReturnRequestForm's tests, in
// Testing Library and happy-dom: one form named for its order that posts unless its action is a
// function, the order's id hidden, a fieldset of the lines each with a quantity select named for its
// line (0 to what may be returned, a line already returned disabled), a required reason, an optional
// note with its limit, the errors beside their fields and counted in a status region that is always
// there, the values kept as sent, the pending submit, what the form sends, a long German and Greek
// label, and the four catalogs.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { ReturnRequest } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { ReturnRequestForm, type ReturnRequestFormProps } from "./return-request-form";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const copyOf = (locale: Locale) => catalogs[locale].organisms.returnRequestForm;
const requestOf = (locale: Locale, which: "blank" | "filled" = "blank"): ReturnRequest =>
  commerceFixtures[locale].account.returnRequest[which];

function element(
  locale: Locale = "en",
  which: "blank" | "filled" = "blank",
  props: Partial<ReturnRequestFormProps> = {},
) {
  return (
    <ReturnRequestForm
      {...requestOf(locale, which)}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      action="/account/returns"
      {...props}
    />
  );
}

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const form = () => slot("return-request-form") as HTMLFormElement;
const sent = () =>
  [...new FormData(form()).entries()].map(([name, value]) => `${name}=${String(value)}`);
const named = (expected: string) => (name: string) => name.replace(/\s+,/g, ",") === expected;
const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((each) => each.getAttribute("class") ?? "");

describe("ReturnRequestForm: the form", () => {
  it.each(LOCALES)("is a form named for its order that posts, in %s", (locale) => {
    render(element(locale));
    const name = formatMessage(
      copyOf(locale).label,
      { number: String(requestOf(locale).displayId) },
      htmlLang[locale],
    );
    expect(screen.getByRole("form", { name })).toBe(form());
    expect(form().getAttribute("method")).toBe("post");
    expect(form().getAttribute("action")).toBe("/account/returns");
    // The number is a name: no grouping.
    expect(name).toContain("1042");
  });

  it("leaves the method to a server action", () => {
    render(element("en", "blank", { action: async () => {} }));
    expect(form().hasAttribute("method")).toBe(false);
  });

  it.each(LOCALES)("lists every line with a quantity select named for it, in %s", (locale) => {
    render(element(locale));
    const copy = copyOf(locale);
    const fieldset = screen.getByRole("group", { name: copy.items });
    const items = requestOf(locale).items;
    const selects = within(fieldset).getAllByRole("combobox") as HTMLSelectElement[];
    expect(selects).toHaveLength(items.length);
    items.forEach((item, index) => {
      const select = selects[index] as HTMLSelectElement;
      expect(select.name).toBe(`items.${item.id}`);
      expect([...select.options].map((option) => option.value)).toEqual(
        Array.from({ length: item.returnable + 1 }, (_, n) => String(n)),
      );
      expect(select.value).toBe("0");
      // Its name says which line: "Quantity to return, Essential Tee (Color: White, Size: M)".
      const options = new Intl.ListFormat(htmlLang[locale], { type: "unit" }).format(
        item.options.map((option) => formatMessage(copy.option, option, htmlLang[locale])),
      );
      const lineName = formatMessage(copy.named, { title: item.title, options }, htmlLang[locale]);
      expect(screen.getByRole("combobox", { name: named(`${copy.quantity}, ${lineName}`) })).toBe(
        select,
      );
    });
  });

  it.each(LOCALES)("says how many of each line may be returned, in %s", (locale) => {
    render(element(locale));
    const item = requestOf(locale).items[1];
    const text = formatMessage(
      copyOf(locale).available,
      { returnable: item?.returnable ?? 0, quantity: item?.quantity ?? 0 },
      htmlLang[locale],
    );
    expect(screen.getByText(text)).toBeTruthy();
  });

  it("disables a line already returned and says so", () => {
    const request = requestOf("en");
    render(
      element("en", "blank", {
        items: request.items.map((item, index) =>
          index === 0 ? { ...item, returnable: 0 } : item,
        ),
      }),
    );
    const first = screen.getAllByRole("combobox")[0] as HTMLSelectElement;
    expect(first.disabled).toBe(true);
    expect(screen.getByText("Already returned")).toBeTruthy();
  });

  it.each(LOCALES)("asks for a reason, required, from the shop's list, in %s", (locale) => {
    render(element(locale));
    const copy = copyOf(locale);
    const reason = screen.getByRole("combobox", { name: copy.reason }) as HTMLSelectElement;
    expect(reason.required).toBe(true);
    expect(reason.name).toBe("reason");
    expect([...reason.options].map((option) => option.textContent)).toEqual([
      copy.reasonPlaceholder,
      ...requestOf(locale).reasons.map((each) => each.label),
    ]);
    expect(reason.options[0]?.disabled).toBe(true);
    expect(reason.value).toBe("");
  });

  it.each(LOCALES)("takes an optional note up to 500 characters, in %s", (locale) => {
    render(element(locale));
    const copy = copyOf(locale);
    const note = screen.getByRole("textbox", {
      name: `${copy.note} ${copy.optional}`,
    }) as HTMLTextAreaElement;
    expect(note.maxLength).toBe(500);
    expect(note.required).toBe(false);
    const hint = document.getElementById(note.getAttribute("aria-describedby") ?? "");
    expect(hint?.textContent).toBe(formatMessage(copy.noteHint, { max: 500 }, htmlLang[locale]));
    expect(note.className).toContain("focus-visible:ring-ring");
  });

  it("starts from what was sent, and sends the order, the quantities, the reason and the note", () => {
    render(element("en", "filled"));
    expect(sent()).toEqual([
      "orderId=order_1042",
      "items.oline_1042_1=0",
      "items.oline_1042_2=1",
      "reason=rr_too_small",
      `note=${requestOf("en", "filled").note}`,
    ]);
  });

  it("is filled in by keyboard alone and sent with Enter", async () => {
    render(element("en"));
    const submitted = vi.fn((event: Event) => event.preventDefault());
    form().addEventListener("submit", submitted);
    const user = userEvent.setup();
    await user.selectOptions(screen.getAllByRole("combobox")[1] as HTMLSelectElement, "2");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Reason for the return" }),
      "rr_too_large",
    );
    await user.type(screen.getByRole("textbox"), "Runs large");
    await user.tab();
    const submit = screen.getByRole("button", { name: "Request return" });
    expect(document.activeElement).toBe(submit);
    expect(submit.className).toContain("min-h-12");
    await user.keyboard("{Enter}");
    expect(submitted).toHaveBeenCalledTimes(1);
    expect(sent()).toContain("items.oline_1042_2=2");
    expect(sent()).toContain("reason=rr_too_large");
    expect(sent()).toContain("note=Runs large");
  });
});

describe("ReturnRequestForm: errors and sending", () => {
  it("has a polite status region that is there and empty at first", () => {
    render(element("en"));
    const region = slot("return-request-status") as HTMLElement;
    expect(region.getAttribute("role")).toBe("status");
    expect(region.textContent).toBe("");
  });

  it.each(LOCALES)("puts each error beside its field and counts them, in %s", (locale) => {
    render(element(locale, "blank", { errors: { items: "required", reason: "required" } }));
    const copy = copyOf(locale);
    const fieldset = screen.getByRole("group", { name: copy.items });
    expect(fieldset.getAttribute("aria-invalid")).toBe("true");
    expect(
      document.getElementById(fieldset.getAttribute("aria-describedby") ?? "")?.textContent,
    ).toBe(copy.errors.items);
    const reason = screen.getByRole("combobox", { name: copy.reason });
    expect(reason.getAttribute("aria-invalid")).toBe("true");
    expect(
      document.getElementById(reason.getAttribute("aria-describedby") ?? "")?.textContent,
    ).toBe(copy.errors.reason);
    expect(slot("return-request-status")?.textContent).toBe(
      formatMessage(copy.summary, { count: 2 }, htmlLang[locale]),
    );
  });

  it("says the request could not be sent", () => {
    render(element("en", "filled", { status: "error" }));
    expect(slot("return-request-status")?.textContent).toBe(copyOf("en").errors.failed);
  });

  it("holds the submit while it is sent", async () => {
    render(element("en", "filled", { status: "pending" }));
    const submit = screen.getByRole("button", { name: "Sending…" });
    expect(submit.getAttribute("aria-disabled")).toBe("true");
    expect(submit.getAttribute("type")).toBe("button");
    expect((form().firstElementChild as HTMLButtonElement).disabled).toBe(true);
    const submitted = vi.fn((event: Event) => event.preventDefault());
    form().addEventListener("submit", submitted);
    submit.focus();
    await userEvent.setup().keyboard("{Enter}");
    expect(submitted).not.toHaveBeenCalled();
  });
});

describe("ReturnRequestForm: long labels", () => {
  it.each(longLabels)("wraps a long %s label and cuts nothing", (locale, long) => {
    const request = requestOf(locale);
    render(
      element(locale, "blank", {
        items: request.items.map((item) => ({ ...item, title: long.productName })),
        reasons: [{ id: "long", label: long.optionLabel }],
        copy: { ...copyOf(locale), items: long.fieldLabel, reason: long.hint, submit: long.action },
      }),
    );
    expect(classesIn(form()).filter((each) => CLIPPING_CLASSES.test(each))).toEqual([]);
    expect(screen.getByText(long.fieldLabel).className).toContain("wrap-anywhere");
    expect(screen.getByText(long.hint).className).toContain("wrap-anywhere");
    expect(screen.getByText(long.action).className).toContain("wrap-anywhere");
    for (const title of screen.getAllByText(long.productName))
      expect(title.className).toContain("wrap-anywhere");
  });
});
