import type { ArrayFieldValidation, TextFieldSingleValidation } from "payload";
import { array, text } from "payload/shared";
import { parseVideoUrl } from "../../lib/cms/video";
import { languageLabel, LANGUAGES } from "../locales";
import { headingField, imageField, mediaOfType, sectionBlock } from "./section-block";

const isUpload = (_: unknown, sibling: { source?: string }) => sibling?.source === "upload";
const isEmbed = (_: unknown, sibling: { source?: string }) => sibling?.source === "embed";

/** A YouTube or Vimeo address the storefront can embed (`parseVideoUrl`). */
const validateEmbedUrl: TextFieldSingleValidation = (value, args) => {
  const base = text(value, args);
  if (base !== true) return base;
  return value == null || value === "" || parseVideoUrl(value) !== null
    ? true
    : "Paste the address of a YouTube or Vimeo video (https).";
};

/**
 * One captions file per language: the player lists each once. The admin's form passes the row
 * count as the value, so the rows are read from the block (`siblingData`) when it does.
 */
const validateCaptions: ArrayFieldValidation = (value, args) => {
  const base = array(value, args);
  if (base !== true) return base;
  const rows = Array.isArray(value)
    ? value
    : (args.siblingData as { captions?: unknown })?.captions;
  if (!Array.isArray(rows)) return true;
  const languages = rows.map((row) => (row as { language?: unknown })?.language).filter(Boolean);
  return new Set(languages).size === languages.length
    ? true
    : "Each language once: one captions file per language.";
};

/**
 * `video` (SPEC §7.4, D79): an upload (MP4 or WebM) with WebVTT captions per language (WCAG 1.2.2:
 * at least one), or a YouTube or Vimeo address, which the page draws as the poster and a play
 * button and loads only after a click. The fields of the source not chosen are hidden, and Payload
 * does not validate a hidden field, so neither half is required while the other is in use.
 */
export const VideoBlock = sectionBlock({
  slug: "video",
  interfaceName: "VideoBlock",
  plural: "Videos",
  fields: [
    headingField,
    {
      name: "title",
      type: "text",
      localized: true,
      required: true,
      admin: { description: "What the video is: the player's name for screen readers." },
    },
    {
      name: "source",
      type: "radio",
      required: true,
      defaultValue: "embed",
      options: [
        { label: "YouTube or Vimeo", value: "embed" },
        { label: "Upload", value: "upload" },
      ],
      admin: { layout: "horizontal" },
    },
    {
      name: "url",
      type: "text",
      required: true,
      validate: validateEmbedUrl,
      admin: {
        condition: isEmbed,
        description: "Nothing is loaded from YouTube or Vimeo until the visitor presses play.",
      },
    },
    {
      name: "file",
      type: "upload",
      relationTo: "media",
      required: true,
      filterOptions: mediaOfType(["video/"]),
      admin: { condition: isUpload, description: "MP4 or WebM." },
    },
    {
      name: "captions",
      type: "array",
      required: true,
      minRows: 1,
      validate: validateCaptions,
      admin: {
        condition: isUpload,
        description: "A WebVTT file per language; the page's language is on by default.",
      },
      fields: [
        {
          name: "language",
          type: "select",
          required: true,
          options: LANGUAGES.map((code) => ({ value: code, label: languageLabel(code) })),
        },
        {
          name: "file",
          type: "upload",
          relationTo: "media",
          required: true,
          filterOptions: mediaOfType(["text/vtt"]),
        },
      ],
    },
    imageField("poster", { description: "Shown until the video plays." }),
    { name: "caption", type: "textarea", localized: true },
  ],
});
