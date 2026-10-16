import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "./avatar";

describe("Avatar", () => {
  it("shows the fallback until the image loads", () => {
    render(
      <Avatar>
        <AvatarImage src="/missing.png" alt="Anna" />
        <AvatarFallback>AK</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText("AK")).toBeTruthy();
  });

  it("has three sizes and a badge at the inline end", () => {
    const { container } = render(
      <Avatar size="lg">
        <AvatarFallback>AK</AvatarFallback>
        <AvatarBadge />
      </Avatar>,
    );
    const root = container.querySelector("[data-slot=avatar]");
    expect(root?.getAttribute("data-size")).toBe("lg");
    expect(container.querySelector("[data-slot=avatar-badge]")?.className).toContain("end-0");
  });

  it.each(longLabels)("takes a %s name as the image's alt", (_locale, strings) => {
    render(
      <Avatar>
        <AvatarFallback aria-label={strings.productName}>H</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByLabelText(strings.productName)).toBeTruthy();
  });
});
