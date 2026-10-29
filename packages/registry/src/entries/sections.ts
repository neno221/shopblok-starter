import {
  FaqSection,
  LogoCloudSection,
  MediaWithTextSection,
  RichTextSection,
  SpacerSection,
  TestimonialsSection,
  UspBarSection,
  VideoSection,
} from "../contracts";
import type { EntryInput } from "../types";

// SPEC §7.4's blocks (D70, D79): each a section in `@shopblok/ui/sections`, drawn by Payload's
// block of the same `block` slug. A block is a family with one member in M4, the `standard`
// variant, so it has a thumbnail (D52) for Payload's block drawer and `variantsOf(family)` lists it
// for the block's `variant` field; M5 adds the other variants as more members of the family.

const section = <const Slug extends string>(
  slug: Slug,
  block: string,
  label: string,
  name: string,
  contract: EntryInput["contract"],
) =>
  ({
    id: `sections/${slug}`,
    group: "sections",
    kind: "section",
    label,
    component: { module: `@shopblok/ui/sections/${slug}`, name },
    family: slug,
    variant: "standard",
    block,
    contract,
  }) as const satisfies EntryInput;

export const sections = [
  // T63: the eight content blocks, in D79's order; T64 adds the nine commerce blocks.
  section("rich-text", "richText", "Rich text", "RichTextSection", RichTextSection),
  section(
    "media-with-text",
    "mediaWithText",
    "Media with text",
    "MediaWithTextSection",
    MediaWithTextSection,
  ),
  section("usp-bar", "uspBar", "USP bar", "UspBarSection", UspBarSection),
  section("logo-cloud", "logoCloud", "Logo cloud", "LogoCloudSection", LogoCloudSection),
  section("faq", "faq", "FAQ", "FaqSection", FaqSection),
  section(
    "testimonials",
    "testimonials",
    "Testimonials",
    "TestimonialsSection",
    TestimonialsSection,
  ),
  section("video", "video", "Video", "VideoSection", VideoSection),
  section("spacer", "spacer", "Spacer", "SpacerSection", SpacerSection),
] as const satisfies readonly EntryInput[];
