import { EmailView } from "@shopblok/registry/contracts";
import { describe, expect, it } from "vitest";
import { designSystemLocales } from "../design-system";
import { emailFixtures } from ".";
import seed from "./templates.json" with { type: "json" };

describe("the e-mail fixtures (M6 D130)", () => {
  it("parse as the layouts' contract, with the seed's copy, in every DS locale", () => {
    for (const locale of designSystemLocales) {
      for (const [type, fixture] of Object.entries(emailFixtures[locale])) {
        expect(EmailView.parse(fixture), `${type} ${locale}`).toEqual(fixture);
        const copy = (seed.templates as Record<string, Record<string, { subject: string }>>)[
          type
        ]?.[locale];
        expect(fixture.copy.subject).toBe(copy?.subject);
        expect(fixture.language).toBe(locale);
        expect(fixture.url.startsWith("https://shop.example/")).toBe(true);
        expect(fixture.url.slice("https://".length), fixture.url).not.toContain("//");
      }
    }
    expect(Object.keys(emailFixtures.en)).toEqual(Object.keys(seed.templates));
    expect(emailFixtures.en["verify-email"].url).toMatch(
      /^https:\/\/shop\.example\/us\/verify\?code=/,
    );
  });
});
