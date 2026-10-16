import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { Kbd, KbdGroup } from "./kbd";

describe("Kbd", () => {
  it("is a kbd element, out of the pointer's way", () => {
    render(
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>,
    );
    const key = screen.getByText("Ctrl");
    expect(key.tagName).toBe("KBD");
    expect(key.className).toContain("pointer-events-none");
  });

  it.each(longLabels)("takes a %s key name", (_locale, strings) => {
    render(<Kbd>{strings.fieldLabel}</Kbd>);
    expect(screen.getByText(strings.fieldLabel).tagName).toBe("KBD");
  });
});
