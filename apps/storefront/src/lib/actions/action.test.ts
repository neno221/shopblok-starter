import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createCookieJar } from "../../test-support/cookie-jar";

const jar = createCookieJar();
vi.mock("next/headers", () => ({ cookies: jar.cookies }));

const { action, ActionError, formDataToObject, toFieldErrors } = await import("./action");
const { MedusaRequestError } = await import("../medusa/sdk");

const schema = z.object({
  email: z.email(),
  name: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

describe("action(): the actions' one shape (D60, SPEC §11.1)", () => {
  it("answers ok with the handler's data for a valid input", async () => {
    const run = action(schema, async (input) => ({ echoed: input.quantity }));
    expect(await run({ email: "a@example.com", name: "Άννα", quantity: "2" })).toEqual({
      ok: true,
      data: { echoed: 2 },
    });
  });

  it("maps zod's issues to a kind per field, T34's shape, and never calls the handler", async () => {
    const handler = vi.fn(async () => 1);
    const run = action(schema, handler);
    expect(await run({ email: "not-an-email", quantity: 0 })).toEqual({
      ok: false,
      errors: { email: "pattern", name: "required", quantity: "invalid" },
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("takes a form's (previousState, formData), as useActionState calls it", async () => {
    const data = new FormData();
    data.set("email", "a@example.com");
    data.set("name", "Ann");
    data.set("quantity", "3");
    data.set("$ACTION_ID_abc", "");
    const run = action(schema, async (input) => input);
    expect(await run(null, data)).toEqual({
      ok: true,
      data: { email: "a@example.com", name: "Ann", quantity: 3 },
    });
  });

  it("answers an ActionError's reason, and Medusa's refusals and outages by kind", async () => {
    const failing = (error: unknown) =>
      action(z.object({}), async () => {
        throw error;
      })({});
    expect(await failing(new ActionError("not-found"))).toEqual({
      ok: false,
      errors: {},
      form: "not-found",
    });
    expect(await failing(new MedusaRequestError("down", "unreachable"))).toEqual({
      ok: false,
      errors: {},
      form: "unavailable",
    });
    expect(
      await failing(
        new MedusaRequestError(
          "Medusa at x answered 400: bad",
          "rejected",
          400,
          new Error("The code is invalid"),
        ),
      ),
    ).toEqual({ ok: false, errors: {}, form: "rejected", message: "The code is invalid" });
    expect(await failing(new MedusaRequestError("x", "rejected", 404))).toMatchObject({
      form: "not-found",
    });
  });

  it("throws anything else on, to the error boundary", async () => {
    await expect(
      action(z.object({}), async () => {
        throw new TypeError("a bug");
      })({}),
    ).rejects.toThrow("a bug");
  });

  it("refuses a customer action when nobody is signed in, without calling Medusa or the handler", async () => {
    jar.reset();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const handler = vi.fn(async () => 1);
    expect(await action(z.object({}), handler, { auth: "customer" })({})).toEqual({
      ok: false,
      errors: {},
      form: "unauthorized",
    });
    expect(handler).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("the helpers", () => {
  it("turns a repeated field into a list", () => {
    const data = new FormData();
    data.append("colour", "black");
    data.append("colour", "navy");
    data.append("colour", "oat");
    expect(formDataToObject(data)).toEqual({ colour: ["black", "navy", "oat"] });
  });

  it("keys nested fields by their path, and keeps the first issue of a field", () => {
    const parsed = z
      .object({ shipping: z.object({ city: z.string().min(1) }) })
      .safeParse({ shipping: { city: "" } });
    expect(toFieldErrors(parsed.error?.issues ?? [])).toEqual({ "shipping.city": "required" });
  });
});
