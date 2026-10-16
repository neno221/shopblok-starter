import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { HeartIcon } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { IconButton } from "./icon-button";

describe("IconButton", () => {
  it("is a button named by its label, at least 44 × 44 px (D32)", () => {
    render(
      <IconButton label="Save for later">
        <HeartIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Save for later" });
    expect(button.className).toContain("size-11");
    expect(button.getAttribute("data-slot")).toBe("icon-button");
    // The icon is decoration: the name is the label alone.
    expect(button.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("is size-12 in the large size", () => {
    render(
      <IconButton label="Save" size="lg">
        <HeartIcon />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Save" }).className).toContain("size-12");
  });

  it("requires a label, and the label is the name", () => {
    // @ts-expect-error -- `label` is required: an icon-only button has no other name (D30).
    render(<IconButton>x</IconButton>);
    render(
      <IconButton label="Save" {...{ "aria-label": "Other" }}>
        <HeartIcon />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });

  it("is reached with Tab, draws the ring at full strength and fires on Enter and Space", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <IconButton label="Save" onClick={onClick}>
        <HeartIcon />
      </IconButton>,
    );
    await user.tab();
    const button = screen.getByRole("button", { name: "Save" });
    expect(document.activeElement).toBe(button);
    expect(button.className).toContain("focus-visible:ring-ring");
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("does nothing when disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <IconButton label="Save" disabled onClick={onClick}>
        <HeartIcon />
      </IconButton>,
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it.each(longLabels)("takes a long %s label as its name", (_locale, strings) => {
    render(
      <IconButton label={strings.hint}>
        <HeartIcon />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: strings.hint })).toBeTruthy();
  });
});
