import type { DesignSystemLocale } from "../design-system";
import { buildCommerceFixture } from "./build";
import { copies } from "./copy";
import type { CommerceFixture } from "./types";

export { fixtureImage, imageRatios, type ImageRatio } from "./images";
export { fixtureNow } from "./now";
export type { CommerceFixture } from "./types";

/** Each DS locale's commerce fixtures: the view models of `@shopblok/registry/contracts` filled in. */
export const commerceFixtures: Record<DesignSystemLocale, CommerceFixture> = {
  en: buildCommerceFixture("en", copies.en),
  el: buildCommerceFixture("el", copies.el),
  de: buildCommerceFixture("de", copies.de),
  fr: buildCommerceFixture("fr", copies.fr),
};
