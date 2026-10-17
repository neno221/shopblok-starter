import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { MediaFigure } from "./media-figure";

const sizes = "(min-width: 768px) 50vw, 100vw";
const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
/** Intl and ICU may write a no-break space where a catalog has a plain one. */
const plain = (text: string | null) => text?.replace(/\s/g, " ");

describe("MediaFigure", () => {
  it.each(LOCALES)("is a figure with the picture, a caption and a credit, in %s", (locale) => {
    const { figure } = commerceFixtures[locale];
    render(
      <MediaFigure
        figure={figure}
        copy={catalogs[locale].molecules.mediaFigure}
        locale={htmlLang[locale]}
        sizes={sizes}
      />,
    );
    const element = screen.getByRole("figure");
    expect(within(element).getByRole("img", { name: figure.image.alt })).toBeTruthy();
    const caption = element.querySelector("figcaption");
    expect(caption?.textContent).toContain(figure.caption);
    // The contract holds the name alone; the copy says it is a photo credit.
    const credit = element.querySelector("[data-slot=media-figure-credit]");
    const expected = catalogs[locale].molecules.mediaFigure.credit.replace(
      "{credit}",
      figure.credit ?? "",
    );
    expect(plain(credit?.textContent ?? null)).toBe(plain(expected));
    expect(credit?.textContent).not.toContain("Photo: Photo");
  });

  it("writes the credit as the language does", () => {
    const render1 = (locale: keyof typeof htmlLang) => {
      const { figure } = commerceFixtures[locale];
      const { container, unmount } = render(
        <MediaFigure
          figure={figure}
          copy={catalogs[locale].molecules.mediaFigure}
          locale={htmlLang[locale]}
          sizes={sizes}
        />,
      );
      const text = plain(
        container.querySelector("[data-slot=media-figure-credit]")?.textContent ?? null,
      );
      unmount();
      return text;
    };
    expect(render1("en")).toBe("Photo: Shopblok Studio");
    expect(render1("el")).toBe("Φωτογραφία: Shopblok Studio");
    expect(render1("de")).toBe("Foto: Shopblok Studio");
    expect(render1("fr")).toBe("Photo : Shopblok Studio");
  });

  const { figure } = commerceFixtures.en;
  const copy = catalogs.en.molecules.mediaFigure;
  const base = { copy, locale: "en-US", sizes } as const;

  it("takes the caption without a credit", () => {
    const { container } = render(
      <MediaFigure {...base} figure={{ ...figure, credit: undefined }} />,
    );
    expect(container.querySelector("figcaption")?.textContent).toBe(figure.caption);
    expect(container.querySelector("[data-slot=media-figure-credit]")).toBeNull();
  });

  it("takes the credit without a caption", () => {
    const { container } = render(
      <MediaFigure {...base} figure={{ ...figure, caption: undefined }} />,
    );
    expect(container.querySelector("figcaption")?.textContent).toBe("Photo: Shopblok Studio");
  });

  it("has no figcaption without either, and the figure is named by its picture only", () => {
    const { container } = render(<MediaFigure {...base} figure={{ image: figure.image }} />);
    expect(container.querySelector("figcaption")).toBeNull();
    expect(screen.getByRole("figure")).toBeTruthy();
    expect(screen.getByRole("img", { name: figure.image.alt })).toBeTruthy();
  });

  it("passes `sizes` on to the picture, and keeps the picture's alternative text", () => {
    // A data URI is served as it is, so next/image writes no `sizes` for it: a path does.
    const photo = { ...figure, image: { ...figure.image, src: "/media/autumn.jpg" } };
    render(<MediaFigure {...base} figure={photo} />);
    const picture = screen.getByRole("img", { name: figure.image.alt });
    expect(picture.getAttribute("sizes")).toBe(sizes);
  });

  it("needs `sizes`", () => {
    // @ts-expect-error -- Image's `sizes` is required, so MediaFigure's is too (PR 43 review, 13).
    render(<MediaFigure figure={figure} copy={copy} locale="en-US" />);
  });

  it.each([
    [1600, 900, "aspect-video"],
    [900, 1200, "aspect-[3/4]"],
    [800, 1000, "aspect-[4/5]"],
    [1200, 800, "aspect-[3/2]"],
    [1000, 1000, "aspect-square"],
    // Taller or wider than any frame: the nearest one.
    [500, 1500, "aspect-[3/4]"],
    [3000, 1000, "aspect-video"],
  ])("gives a %i × %i picture the %s frame", (width, height, frame) => {
    const { container } = render(
      <MediaFigure {...base} figure={{ ...figure, image: { ...figure.image, width, height } }} />,
    );
    expect(container.querySelector("[data-slot=image]")?.className).toContain(frame);
  });

  it("lets the page choose the frame", () => {
    const { container } = render(<MediaFigure {...base} figure={figure} ratio="square" />);
    expect(container.querySelector("[data-slot=image]")?.className).toContain("aspect-square");
  });

  it("passes the figure's own props on, and merges the class", () => {
    render(<MediaFigure {...base} figure={figure} className="max-w-md" id="autumn" />);
    const element = screen.getByRole("figure");
    expect(element.id).toBe("autumn");
    expect(element.className).toContain("max-w-md");
  });

  it.each(longLabels)(
    "wraps a long %s caption and credit instead of cutting them",
    (_l, strings) => {
      const { container } = render(
        <MediaFigure
          {...base}
          figure={{ ...figure, caption: strings.helpText, credit: strings.personName }}
        />,
      );
      expect(container.textContent).toContain(strings.helpText);
      expect(container.textContent).toContain(strings.personName);
      for (const part of container.querySelectorAll("figcaption, figcaption span")) {
        expect(part.className).not.toMatch(CLIPPING_CLASSES);
      }
      for (const part of container.querySelectorAll("figcaption span")) {
        expect(part.className).toContain("wrap-anywhere");
      }
    },
  );
});
