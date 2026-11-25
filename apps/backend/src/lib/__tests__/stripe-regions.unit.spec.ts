import { regionChanges, wantedProviders } from "../stripe-regions";

const STRIPE = "pp_stripe_stripe";
const SYSTEM = "pp_system_default";

describe("sync-stripe-regions (M6 D117)", () => {
  it("adds Stripe beside the system payment while Stripe is registered", () => {
    expect(wantedProviders([SYSTEM], true)).toEqual([STRIPE, SYSTEM]);
    expect(wantedProviders([], true)).toEqual([STRIPE, SYSTEM]);
  });

  it("takes Stripe off and keeps the system payment when Stripe is not registered", () => {
    expect(wantedProviders([STRIPE, SYSTEM], false)).toEqual([SYSTEM]);
    expect(wantedProviders([STRIPE], false)).toEqual([SYSTEM]);
  });

  it("keeps a provider an owner added that is neither", () => {
    expect(wantedProviders(["pp_other", SYSTEM], true)).toEqual(["pp_other", STRIPE, SYSTEM]);
  });

  it("changes only the regions that differ, so a second run changes nothing", () => {
    const regions = [
      { id: "reg_1", name: "Europe", providers: [SYSTEM] },
      { id: "reg_2", name: "US", providers: [SYSTEM, STRIPE] },
    ];
    expect(regionChanges(regions, true)).toEqual([
      { id: "reg_1", name: "Europe", providers: [STRIPE, SYSTEM] },
    ]);
    expect(regionChanges(regions, false)).toEqual([
      { id: "reg_2", name: "US", providers: [SYSTEM] },
    ]);
    const synced = regions.map((r) => ({ ...r, providers: wantedProviders(r.providers, true) }));
    expect(regionChanges(synced, true)).toEqual([]);
  });
});
