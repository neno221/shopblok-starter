import { describe, expect, it } from "vitest";
import { copyFromTemplate } from "./copy";
import { lexicalToText, paragraphs } from "./rich-text";

const english = {
  subject: "Confirm your subscription",
  preheader: "One click left.",
  heading: "Confirm",
  body: ["Hello,", "Press the button."],
  cta: "Confirm",
};

describe("copyFromTemplate: a stored template with the seed's English in its gaps (both apps)", () => {
  it("takes every field Payload has, in its language", () => {
    const body = paragraphs(["Γεια σας,"]);
    const result = copyFromTemplate(
      { subject: "Επιβεβαίωση", preheader: "Ένα κλικ.", heading: "Επιβεβαίωση", body, cta: "Πάτα" },
      english,
      "el",
    );
    expect(result).toEqual({
      copy: {
        subject: "Επιβεβαίωση",
        preheader: "Ένα κλικ.",
        heading: "Επιβεβαίωση",
        body,
        cta: "Πάτα",
      },
      language: "el",
      source: "payload",
    });
  });

  it("fills each empty field (blank text, a body without text) with the English", () => {
    const result = copyFromTemplate(
      { subject: "Επιβεβαίωση", preheader: "  ", heading: null, body: paragraphs([""]) },
      english,
      "el",
    );
    expect(result.copy.subject).toBe("Επιβεβαίωση");
    expect(result.copy.preheader).toBe(english.preheader);
    expect(result.copy.heading).toBe(english.heading);
    expect(lexicalToText(result.copy.body)).toBe("Hello,\n\nPress the button.");
    expect(result.copy.cta).toBe(english.cta);
    expect(result.language).toBe("el");
  });

  it("is the English, in English, without a stored subject or without a template", () => {
    for (const stored of [null, undefined, { heading: "Επιβεβαίωση" }]) {
      const result = copyFromTemplate(stored, english, "el");
      expect(result.language).toBe("en");
      expect(result.source).toBe("built-in");
      expect(result.copy.subject).toBe(english.subject);
    }
  });
});
