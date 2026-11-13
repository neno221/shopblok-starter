import analyticsCartCreated, {
  config as cartConfig,
} from "../../subscribers/analytics-cart-created";
import analyticsOrderCanceled, {
  config as canceledConfig,
} from "../../subscribers/analytics-order-canceled";
import analyticsOrderPlaced, {
  config as placedConfig,
} from "../../subscribers/analytics-order-placed";
import { analyticsActor, analyticsContext } from "../analytics";

/** A container with a fake Analytics Module (the keyless case of the live spec, D124). */
function containerWith(rows: Record<string, unknown[]>, track = jest.fn()) {
  const log = { warn: jest.fn(), error: jest.fn() };
  const services: Record<string, unknown> = {
    logger: log,
    query: {
      graph: jest.fn(async ({ entity }: { entity: string }) => ({ data: rows[entity] ?? [] })),
    },
    analytics: { track },
  };
  return { container: { resolve: (key: string) => services[key] } as never, track, log };
}

const consented = {
  analytics_consent: true,
  posthog_distinct_id: "019a0c2e-7f3b-7c1d-9a3e-123456789abc",
  market_key: "el-cy",
  market: "/cy",
  language: "el",
};

const order = (metadata: Record<string, unknown> | null) => ({
  id: "order_1",
  display_id: 7,
  currency_code: "eur",
  total: 59.5,
  customer_id: "cus_1",
  locale: "el-GR",
  metadata,
  items: [{ quantity: 2 }, { quantity: 1 }],
});

describe("Medusa's analytics events (T97, D124)", () => {
  it("subscribes to the three events", () => {
    expect([placedConfig.event, canceledConfig.event, cartConfig.event]).toEqual([
      "order.placed",
      "order.canceled",
      "cart.created",
    ]);
  });

  it("sends order_placed for a consented order, as the visitor's distinct id", async () => {
    const { container, track } = containerWith({ order: [order(consented)] });
    await analyticsOrderPlaced({ event: { data: { id: "order_1" } }, container } as never);
    expect(track.mock.calls).toEqual([
      [
        {
          event: "order_placed",
          actor_id: consented.posthog_distinct_id,
          properties: {
            market: "el-cy",
            locale: "el-GR",
            order_id: "order_1",
            order_number: 7,
            currency: "eur",
            total: 59.5,
            items: 3,
          },
        },
      ],
    ]);
  });

  it("sends nothing for an order without consent, or whose consent was withdrawn", async () => {
    for (const metadata of [
      null,
      {},
      { market: "/cy", language: "el" },
      // Only `true` is consent: anything else the metadata might say is not.
      { analytics_consent: "true", posthog_distinct_id: "x" },
      { analytics_consent: false },
    ]) {
      const { container, track } = containerWith({ order: [order(metadata)] });
      await analyticsOrderPlaced({ event: { data: { id: "order_1" } }, container } as never);
      await analyticsOrderCanceled({ event: { data: { id: "order_1" } }, container } as never);
      expect(track).not.toHaveBeenCalled();
    }
  });

  it("sends order_canceled for a consented order", async () => {
    const { container, track } = containerWith({ order: [order(consented)] });
    await analyticsOrderCanceled({ event: { data: { id: "order_1" } }, container } as never);
    expect(track.mock.calls[0][0]).toMatchObject({
      event: "order_canceled",
      actor_id: consented.posthog_distinct_id,
    });
  });

  it("sends cart_created for a cart made with consent, and nothing for one without", async () => {
    const cart = { id: "cart_1", currency_code: "eur", customer_id: null, locale: "el-GR" };
    const yes = containerWith({ cart: [{ ...cart, metadata: consented }] });
    await analyticsCartCreated({
      event: { data: { id: "cart_1" } },
      container: yes.container,
    } as never);
    expect(yes.track.mock.calls).toEqual([
      [
        {
          event: "cart_created",
          actor_id: consented.posthog_distinct_id,
          properties: { market: "el-cy", locale: "el-GR", cart_id: "cart_1", currency: "eur" },
        },
      ],
    ]);
    const no = containerWith({ cart: [{ ...cart, metadata: { market_key: "el-cy" } }] });
    await analyticsCartCreated({
      event: { data: { id: "cart_1" } },
      container: no.container,
    } as never);
    expect(no.track).not.toHaveBeenCalled();
  });

  it("sends nothing for an order or cart Medusa does not have", async () => {
    const { container, track } = containerWith({});
    await analyticsOrderPlaced({ event: { data: { id: "order_x" } }, container } as never);
    await analyticsCartCreated({ event: { data: { id: "cart_x" } }, container } as never);
    expect(track).not.toHaveBeenCalled();
  });

  it("logs and swallows a provider's failure: the order is placed whatever PostHog says", async () => {
    const track = jest.fn().mockRejectedValue(new Error("PostHog is down"));
    const { container, log } = containerWith({ order: [order(consented)] }, track);
    await expect(
      analyticsOrderPlaced({ event: { data: { id: "order_1" } }, container } as never),
    ).resolves.toBeUndefined();
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("PostHog is down"));
  });

  it("names the person: the distinct id, else the customer, else the order with no profile", () => {
    const base = { id: "order_1", customer_id: "cus_1" };
    expect(analyticsActor({ ...base, metadata: consented })).toEqual({
      actorId: consented.posthog_distinct_id,
      person: true,
    });
    expect(analyticsActor({ ...base, metadata: { analytics_consent: true } })).toEqual({
      actorId: "cus_1",
      person: true,
    });
    // A distinct id that is not one PostHog's cookie would hold is not used.
    expect(
      analyticsActor({
        id: "order_1",
        metadata: { analytics_consent: true, posthog_distinct_id: "a b" },
      }),
    ).toEqual({ actorId: "order_1", person: false });
    expect(analyticsActor({ ...base, metadata: { posthog_distinct_id: "x" } })).toBeNull();
  });

  it("says market and locale as the browser does, or null", () => {
    expect(analyticsContext({ id: "c", metadata: consented, locale: "el-GR" })).toEqual({
      market: "el-cy",
      locale: "el-GR",
    });
    expect(analyticsContext({ id: "c" })).toEqual({ market: null, locale: null });
  });

  it("marks an event with no person as one that makes no profile", async () => {
    const { container, track } = containerWith({
      order: [{ ...order({ analytics_consent: true }), customer_id: null }],
    });
    await analyticsOrderPlaced({ event: { data: { id: "order_1" } }, container } as never);
    expect(track.mock.calls[0][0]).toMatchObject({
      actor_id: "order_1",
      properties: { $process_person_profile: false },
    });
  });
});
