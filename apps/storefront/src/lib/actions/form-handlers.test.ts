// The forms' server action (D81, T67): what it checks before it stores a submission, and how it
// stores one. The form read (`readForm`) and the Local API are stand-ins and the market map is the
// seeded one, so nothing here touches Payload's database or the network.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { formFields } from "../forms/fields";
import { seeded } from "../markets/test-maps";

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn(), updateTag: vi.fn() }));
vi.mock("../markets/cached-market-map", () => ({ getRenderMarketMap: async () => seeded }));
const readForm = vi.fn();
vi.mock("../cms/forms", () => ({ readForm }));
const create = vi.fn();
vi.mock("../cms/payload", () => ({ getPayloadClient: async () => ({ create }) }));

const { submitFormAction, formState } = await import("./form-handlers");
const { submitForm } = await import("./form");

const contact = {
  id: 7,
  fields: formFields([
    { blockType: "text", name: "name", label: "Name", required: true },
    { blockType: "email", name: "email", label: "Email", required: true },
    { blockType: "checkbox", name: "consent", label: "I agree", required: true },
  ]),
};
const answers = { name: "Ann", email: "ann@example.com", consent: "on", website: "" };

beforeEach(() => {
  readForm.mockReset().mockResolvedValue(contact);
  create.mockReset().mockResolvedValue({ id: 1 });
});

describe("submitFormAction: a post to a form built in the admin (D81)", () => {
  it("stores a valid post through the Local API, past the closed REST create, as the form's fields", async () => {
    expect(await submitFormAction({ market: "en-us", form: "7", answers })).toEqual({
      ok: true,
      data: { stored: true },
    });
    expect(readForm).toHaveBeenCalledWith(
      expect.objectContaining({ market: expect.objectContaining({ key: "en-us" }), draft: false }),
      7,
    );
    expect(create).toHaveBeenCalledWith({
      collection: "form-submissions",
      data: {
        form: 7,
        submissionData: [
          { field: "name", value: "Ann" },
          { field: "email", value: "ann@example.com" },
          { field: "consent", value: "true" },
        ],
      },
      depth: 0,
      overrideAccess: true,
      user: null,
    });
  });

  it("answers a filled spam trap with success and stores nothing, without reading the form", async () => {
    const result = await submitFormAction({
      market: "en-us",
      form: "7",
      answers: { ...answers, website: "https://spam.example" },
    });
    expect(result).toEqual({ ok: true, data: { stored: false } });
    expect(readForm).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses the fields the form's schema refuses, by kind, and stores nothing", async () => {
    const result = await submitFormAction({
      market: "en-us",
      form: "7",
      answers: { name: "", email: "ann@", website: "" },
    });
    expect(result).toEqual({
      ok: false,
      errors: { name: "required", email: "pattern", consent: "required" },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("answers not-found for a market or form that is not there, and a bad bound part as fields", async () => {
    expect(await submitFormAction({ market: "atlantis", form: "7", answers })).toMatchObject({
      ok: false,
      form: "not-found",
    });
    readForm.mockResolvedValueOnce(null);
    expect(await submitFormAction({ market: "en-us", form: "8", answers })).toMatchObject({
      ok: false,
      form: "not-found",
    });
    expect(await submitFormAction({ market: "en-us", form: "../7", answers })).toMatchObject({
      ok: false,
      errors: { form: "pattern" },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("answers unavailable when the submission cannot be stored", async () => {
    create.mockRejectedValueOnce(new Error("database down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});
    expect(await submitFormAction({ market: "en-us", form: "7", answers })).toEqual({
      ok: false,
      errors: {},
      form: "unavailable",
    });
  });
});

describe("submitForm and formState: the island's state (T67)", () => {
  it("is done for a person and for a bot alike", async () => {
    const data = new FormData();
    for (const [name, value] of Object.entries(answers)) data.set(name, value);
    expect(await submitForm({ market: "en-us", form: "7" }, { status: "idle" }, data)).toEqual({
      status: "done",
    });
    data.set("website", "bot");
    expect(await submitForm({ market: "en-us", form: "7" }, { status: "idle" }, data)).toEqual({
      status: "done",
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("types back what was sent, without the spam trap or Next's own fields", () => {
    expect(
      formState(
        { ok: false, errors: { email: "pattern" } },
        { name: "Ann", email: "ann@", website: "x", $ACTION_KEY: "k", list: ["a", "b"] },
      ),
    ).toEqual({
      status: "error",
      errors: { email: "pattern" },
      values: { name: "Ann", email: "ann@" },
    });
    expect(formState({ ok: false, errors: {}, form: "unavailable" }, {})).toEqual({
      status: "error",
      errors: {},
      values: {},
      form: "unavailable",
    });
  });

  it("takes a bound part that is not an object as a bad post", async () => {
    expect(await submitForm(null, { status: "idle" }, new FormData())).toMatchObject({
      status: "error",
      errors: { market: "required", form: "required" },
    });
  });
});
