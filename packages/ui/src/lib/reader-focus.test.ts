import { describe, expect, it } from "vitest";
import { takesFocusWhenOpenedByAReader } from "./reader-focus";

describe("takesFocusWhenOpenedByAReader", () => {
  it("takes no focus when the popup opens by itself, and the default when a reader opens it", () => {
    expect(takesFocusWhenOpenedByAReader("")).toBe(false);
    for (const interaction of ["mouse", "touch", "pen", "keyboard"]) {
      expect(takesFocusWhenOpenedByAReader(interaction)).toBe(true);
    }
  });
});
