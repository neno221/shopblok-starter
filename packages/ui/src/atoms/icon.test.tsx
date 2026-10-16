import { render, screen } from "@testing-library/react";
import { HeartIcon } from "lucide-react";
import { describe, expect, it } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { Icon } from "./icon";

describe("Icon", () => {
  it("is hidden from assistive technology without a label", () => {
    const { container } = render(<Icon icon={HeartIcon} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("role")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("is an image named by its label", () => {
    const { container } = render(<Icon icon={HeartIcon} label="Saved" />);
    const image = screen.getByRole("img", { name: "Saved" });
    expect(image.getAttribute("aria-hidden")).toBeNull();
    expect(container.querySelector("svg")).toBe(image);
  });

  it("is size-4 by default and takes the size tokens", () => {
    const { container, rerender } = render(<Icon icon={HeartIcon} />);
    const classOf = () => container.querySelector("svg")?.getAttribute("class") ?? "";
    expect(classOf()).toContain("size-4");
    for (const [size, token] of [
      ["xs", "size-3"],
      ["sm", "size-4"],
      ["md", "size-5"],
      ["lg", "size-6"],
      ["xl", "size-8"],
    ] as const) {
      rerender(<Icon icon={HeartIcon} size={size} />);
      expect(classOf()).toContain(token);
    }
  });

  it("draws in the text's colour", () => {
    const { container } = render(<Icon icon={HeartIcon} />);
    expect(container.querySelector("svg")?.getAttribute("stroke")).toBe("currentColor");
  });

  it.each(longLabels)("takes a long %s label", (_locale, strings) => {
    render(<Icon icon={HeartIcon} label={strings.hint} />);
    expect(screen.getByRole("img", { name: strings.hint })).toBeTruthy();
  });
});
