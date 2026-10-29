import {
  BundleSection,
  CategoryShowcaseSection,
  CollectionSpotlightSection,
  ComparisonSection,
  FaqSection,
  FeaturedProductSection,
  FormBlockSection,
  HeroSection,
  LogoCloudSection,
  MediaWithTextSection,
  NewsletterSection,
  ProductCollectionSection,
  PromoBannerSection,
  RecentlyViewedSection,
  RichTextSection,
  SpacerSection,
  TestimonialsSection,
  UspBarSection,
  VideoSection,
} from "@shopblok/registry/contracts";
import { describe, expect, it } from "vitest";
import { commerceFixtures } from "../commerce";
import { fixtureNow } from "../commerce/now";
import { designSystemLocales } from "../design-system";
import { sectionFixtures } from ".";

describe("the sections' fixtures (T63)", () => {
  it("parse as the sections' contracts in every locale", () => {
    for (const locale of designSystemLocales) {
      const f = sectionFixtures[locale];
      expect(RichTextSection.parse(f.richText.section)).toEqual(f.richText.section);
      for (const each of [f.mediaWithText.section, f.mediaWithText.long])
        expect(MediaWithTextSection.parse(each)).toEqual(each);
      for (const each of [f.uspBar.section, f.uspBar.long])
        expect(UspBarSection.parse(each)).toEqual(each);
      expect(LogoCloudSection.parse(f.logoCloud.section)).toEqual(f.logoCloud.section);
      for (const each of [f.faq.section, f.faq.long]) expect(FaqSection.parse(each)).toEqual(each);
      for (const each of [f.testimonials.section, f.testimonials.long])
        expect(TestimonialsSection.parse(each)).toEqual(each);
      for (const each of [f.video.embed, f.video.file, f.video.long])
        expect(VideoSection.parse(each)).toEqual(each);
      expect(SpacerSection.parse(f.spacer.section)).toEqual(f.spacer.section);
      for (const each of [f.newsletter.section, f.newsletter.long])
        expect(NewsletterSection.parse(each)).toEqual(each);
      for (const each of [f.formBlock.section, f.formBlock.long])
        expect(FormBlockSection.parse(each)).toEqual(each);
    }
  });

  it("link inside the locale's market, and outside it only to an https site", () => {
    for (const locale of designSystemLocales) {
      const { prefix } = commerceFixtures[locale];
      const f = sectionFixtures[locale];
      for (const link of [...f.mediaWithText.section.links, f.richText.body.link])
        expect(link.href.startsWith(`${prefix}/`), link.href).toBe(true);
      for (const logo of f.logoCloud.section.logos)
        if (logo.href !== undefined) expect(logo.href).toMatch(/^https:\/\//);
    }
  });

  it("give the logos their brand's name as the alternative text, and fetch nothing", () => {
    for (const logo of sectionFixtures.en.logoCloud.section.logos) {
      expect(logo.image.alt).toBe(logo.name);
      expect(logo.image.src).toMatch(/^data:image\/svg\+xml,/);
    }
    const { file } = sectionFixtures.el.video;
    if (file.source.kind !== "file") throw new Error("the upload sample is not a file");
    expect(file.source.src).toMatch(/^data:video\/mp4/);
    expect(file.source.tracks.map((track) => track.srclang)).toEqual(["en", "el", "de", "fr"]);
    for (const track of file.source.tracks) expect(track.src).toMatch(/^data:text\/vtt,WEBVTT/);
  });

  it("have a longer text in the long samples than in the ordinary ones", () => {
    for (const locale of designSystemLocales) {
      const f = sectionFixtures[locale];
      expect(f.mediaWithText.long.heading?.length).toBeGreaterThan(
        f.mediaWithText.section.heading?.length ?? 0,
      );
      expect(f.video.long.title.length).toBeGreaterThan(f.video.embed.title.length);
      expect(f.faq.long.items[0]?.title.length).toBeGreaterThan(
        Math.max(...f.faq.section.items.map((item) => item.title.length)),
      );
      expect(f.newsletter.long.heading?.length).toBeGreaterThan(
        f.newsletter.section.heading?.length ?? 0,
      );
      const labels = (section: typeof f.formBlock.section) =>
        section.form.fields.map((field) => ("label" in field ? field.label.length : 0));
      expect(Math.max(...labels(f.formBlock.long))).toBeGreaterThan(
        Math.max(...labels(f.formBlock.section)),
      );
    }
  });

  it("give the contact form every kind of field once, each name once (T67)", () => {
    for (const locale of designSystemLocales) {
      const { fields } = sectionFixtures[locale].formBlock.section.form;
      expect(new Set(fields.map((field) => field.kind))).toEqual(
        new Set(["text", "email", "select", "textarea", "message", "checkbox"]),
      );
    }
  });

  it("parse the commerce sections' contracts in every locale (T64)", () => {
    for (const locale of designSystemLocales) {
      const f = sectionFixtures[locale];
      for (const each of Object.values(f.hero)) expect(HeroSection.parse(each)).toEqual(each);
      for (const each of Object.values(f.categoryShowcase))
        expect(CategoryShowcaseSection.parse(each)).toEqual(each);
      for (const each of Object.values(f.productCollection))
        expect(ProductCollectionSection.parse(each)).toEqual(each);
      for (const each of Object.values(f.featuredProduct))
        expect(FeaturedProductSection.parse(each)).toEqual(each);
      for (const each of Object.values(f.bundle)) expect(BundleSection.parse(each)).toEqual(each);
      for (const each of Object.values(f.promoBanner))
        expect(PromoBannerSection.parse(each)).toEqual(each);
      for (const each of Object.values(f.comparison))
        expect(ComparisonSection.parse(each)).toEqual(each);
      for (const each of Object.values(f.collectionSpotlight))
        expect(CollectionSpotlightSection.parse(each)).toEqual(each);
      expect(RecentlyViewedSection.parse(f.recentlyViewed.section)).toEqual(
        f.recentlyViewed.section,
      );
    }
  });

  it("show the commerce fixtures' products in the market's currency, and end after the fixed now", () => {
    for (const locale of designSystemLocales) {
      const { products, prefix } = commerceFixtures[locale];
      const f = sectionFixtures[locale];
      const currency = products[0]?.price.price.currencyCode;
      for (const card of [...f.hero.offer.products, ...f.productCollection.carousel.products])
        expect(card.price.price.currencyCode).toBe(currency);
      for (const tile of f.categoryShowcase.section.tiles)
        expect(tile.href.startsWith(`${prefix}/categories/`), tile.href).toBe(true);
      expect(Date.parse(f.hero.offer.countdown?.endsAt ?? "")).toBeGreaterThan(
        Date.parse(fixtureNow),
      );
      expect(Date.parse(f.promoBanner.section.endsAt ?? "")).toBeGreaterThan(
        Date.parse(fixtureNow),
      );
      expect(f.comparison.two.rows[0]?.values).toContain(null);
    }
  });
});
