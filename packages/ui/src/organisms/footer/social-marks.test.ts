// Ours (T36, SETUP.md "Footers and site organisms (T36)"). The one test that imports `simple-icons`
// (a 5.25 MB module) for the footers: it keeps `social-marks.ts`, our copy of eight marks, equal to
// the package. The footers' own tests do not import it, so a cold start of those does not pay for it
// (as `atoms/payment-marks.test.ts` does for PaymentIcon).
import { SocialNetwork } from "@shopblok/registry/contracts";
import * as simpleIcons from "simple-icons";
import { describe, expect, it } from "vitest";
import { socialMarks } from "./social-marks";

const packageKey = {
  instagram: "siInstagram",
  facebook: "siFacebook",
  tiktok: "siTiktok",
  youtube: "siYoutube",
  pinterest: "siPinterest",
  x: "siX",
  threads: "siThreads",
  bluesky: "siBluesky",
} as const;

const networks = Object.keys(socialMarks) as (keyof typeof socialMarks)[];

describe("social-marks.ts", () => {
  it("has the eight networks of the footer contract, in its order", () => {
    expect(networks).toEqual(SocialNetwork.options);
    expect([...networks].sort()).toEqual(Object.keys(packageKey).sort());
  });

  it.each(networks)("%s is simple-icons' mark, path, title and colour", (network) => {
    const icon = simpleIcons[packageKey[network]];
    expect(socialMarks[network]).toEqual({ title: icon.title, hex: icon.hex, path: icon.path });
  });

  it.each(networks)("%s is a slug the package knows, drawn in a 24 × 24 box", (network) => {
    expect(simpleIcons[packageKey[network]].slug).toBe(network);
    expect(socialMarks[network].path).toMatch(/^M[\d.\s-]/);
    expect(socialMarks[network].hex).toMatch(/^[0-9A-F]{6}$/);
    expect(socialMarks[network].title.length).toBeGreaterThan(0);
  });

  it("is small: under 8 KB, against the package root's 5 MB", () => {
    const size = networks.reduce((sum, network) => sum + socialMarks[network].path.length, 0);
    expect(size).toBeLessThan(8_000);
  });
});
