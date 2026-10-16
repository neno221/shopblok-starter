import { sampleImage } from "@shopblok/fixtures";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { Image } from "./image";

const frameOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-slot=image]") as HTMLElement;

describe("Image", () => {
  it("renders the picture named by its alt, in a frame with an aspect ratio and a radius token", () => {
    const { container } = render(
      <Image src={sampleImage.src} alt="A folded hoodie" ratio="portrait" radius="lg" />,
    );
    expect(screen.getByRole("img", { name: "A folded hoodie" })).toBeTruthy();
    const frame = frameOf(container);
    expect(frame.className).toContain("aspect-[4/5]");
    expect(frame.className).toContain("rounded-lg");
    expect(frame.className).toContain("overflow-hidden");
  });

  it("is a square with the md radius by default", () => {
    const { container } = render(<Image src={sampleImage.src} alt="x" />);
    expect(frameOf(container).className).toContain("aspect-square");
    expect(frameOf(container).className).toContain("rounded-md");
  });

  it("shows a skeleton until the picture has loaded, then hides it", async () => {
    const { container } = render(<Image src={sampleImage.src} alt="A folded hoodie" />);
    const frame = frameOf(container);
    expect(frame.querySelector("[data-slot=image-placeholder]")).not.toBeNull();
    expect(frame.getAttribute("data-loaded")).toBeNull();
    fireEvent.load(screen.getByRole("img", { name: "A folded hoodie" }));
    // next/image reports the load after the picture has decoded.
    await waitFor(() => expect(frame.querySelector("[data-slot=image-placeholder]")).toBeNull());
    expect(frame.getAttribute("data-loaded")).toBe("");
  });

  it("hides the skeleton from assistive technology", () => {
    const { container } = render(<Image src={sampleImage.src} alt="x" />);
    expect(
      container.querySelector("[data-slot=image-placeholder]")?.getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("takes an empty alt, but only when it is passed on purpose", () => {
    const { container } = render(<Image src={sampleImage.src} alt="" />);
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
  });

  it("requires alt", () => {
    // @ts-expect-error -- `alt` is required: an image needs a description, or an empty one on purpose.
    render(<Image src={sampleImage.src} />);
  });

  it.each(longLabels)("takes a long %s alt", (_locale, strings) => {
    render(<Image src={sampleImage.src} alt={strings.imageAlt} />);
    expect(screen.getByRole("img", { name: strings.imageAlt })).toBeTruthy();
  });
});
