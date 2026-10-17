import { readFileSync } from "node:fs";
import path from "node:path";
import { act, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "./carousel";

const source = readFileSync(path.join(import.meta.dirname, "carousel.tsx"), "utf8");

const labels = {
  roleDescriptionLabel: "carousel",
  slideRoleDescriptionLabel: "slide",
};

function Slides(
  props: Partial<React.ComponentProps<typeof Carousel>> & {
    previous?: string;
    next?: string;
    slides?: number;
  },
) {
  const { previous = "Previous slide", next = "Next slide", slides = 3, ...rest } = props;
  return (
    <Carousel aria-label="Related products" {...labels} {...rest}>
      <CarouselContent>
        {Array.from({ length: slides }, (_, index) => (
          <CarouselItem key={index} aria-label={`${index + 1} of ${slides}`}>
            <a href={`#product-${index + 1}`}>Product {index + 1}</a>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious label={previous} />
      <CarouselNext label={next} />
    </Carousel>
  );
}

/** Renders the carousel and waits for embla, which starts in an effect. */
async function renderWithApi(ui: (setApi: (api: CarouselApi) => void) => React.ReactElement) {
  let api: CarouselApi;
  render(
    ui((value) => {
      api = value;
    }),
  );
  await waitFor(() => expect(api).toBeTruthy());
  return api!;
}

describe("Carousel", () => {
  it("says in its header why it is a client component", () => {
    expect(source).toMatch(/^"use client";$/m);
    expect(source.split('"use client"')[0]).toMatch(/client component because/);
  });

  it("is a region with the required role descriptions, and a group per slide", () => {
    render(<Slides roleDescriptionLabel="Karussell" slideRoleDescriptionLabel="Folie" />);
    const region = screen.getByRole("region", { name: "Related products" });
    expect(region.getAttribute("aria-roledescription")).toBe("Karussell");
    const slides = screen.getAllByRole("group");
    expect(slides).toHaveLength(3);
    for (const slide of slides) {
      expect(slide.getAttribute("aria-roledescription")).toBe("Folie");
    }
    expect(slides[0]?.getAttribute("aria-label")).toBe("1 of 3");
  });

  it("requires the role descriptions and the buttons' labels, and has no English of its own", () => {
    render(
      <Slides
        roleDescriptionLabel="Karussell"
        slideRoleDescriptionLabel="Folie"
        previous="Vorherige Folie"
        next="Nächste Folie"
      />,
    );
    const html = document.body.innerHTML;
    for (const english of ["Previous slide", "Next slide"]) {
      expect(html).not.toContain(english);
    }
    expect(html).not.toMatch(/aria-roledescription="(?:carousel|slide)"/);
    expect(screen.getByRole("button", { name: "Vorherige Folie" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nächste Folie" })).toBeTruthy();
    // @ts-expect-error -- `roleDescriptionLabel` and `slideRoleDescriptionLabel` are required.
    render(<Carousel>x</Carousel>);
    render(
      <Carousel {...labels}>
        {/* @ts-expect-error -- `label` is required on both buttons. */}
        <CarouselPrevious />
        {/* @ts-expect-error -- `label` is required on both buttons. */}
        <CarouselNext />
      </Carousel>,
    );
  });

  it("makes the previous and next buttons 44 × 44 px (D32): the kit's icon-sm is gone", () => {
    render(<Slides />);
    for (const name of ["Previous slide", "Next slide"]) {
      const button = screen.getByRole("button", { name });
      expect(button.className).toContain("size-11");
      expect(button.className).not.toMatch(/size-(?:8|9)(?:\s|$)/);
    }
    // The icon is decoration: the button's name is the label alone.
    expect(
      screen
        .getByRole("button", { name: "Next slide" })
        .querySelector("svg")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("sits its buttons at the logical start and end, and the track and slides use ms and ps", () => {
    render(<Slides />);
    const previous = screen.getByRole("button", { name: "Previous slide" });
    const next = screen.getByRole("button", { name: "Next slide" });
    expect(previous.className).toContain("-start-12");
    expect(next.className).toContain("-end-12");
    expect(previous.className + next.className).not.toMatch(/-(?:left|right)-12/);
    const track = document.querySelector("[data-slot=carousel-content] > div");
    expect(track?.className).toContain("-ms-4");
    expect(track?.className).not.toContain("-ml-4");
    for (const slide of screen.getAllByRole("group")) {
      expect(slide.className).toContain("ps-4");
      expect(slide.className).not.toContain("pl-4");
    }
  });

  it("points the chevrons along the reading direction in a horizontal carousel", () => {
    render(<Slides />);
    for (const name of ["Previous slide", "Next slide"]) {
      expect(
        screen.getByRole("button", { name }).querySelector("svg")?.getAttribute("class"),
      ).toContain("rtl:rotate-180");
    }
  });

  it("keeps a vertical carousel's chevrons as they are (up and down do not flip), and centres its buttons without a left or right", () => {
    render(<Slides orientation="vertical" />);
    for (const name of ["Previous slide", "Next slide"]) {
      const button = screen.getByRole("button", { name });
      expect(button.querySelector("svg")?.getAttribute("class")).not.toContain("rtl:rotate-180");
      expect(button.className).toContain("rotate-90");
      expect(button.className).toContain("inset-x-0");
      expect(button.className).toContain("mx-auto");
      expect(button.className).not.toMatch(/(?:^|\s)(?:left|right)-/);
    }
    const track = document.querySelector("[data-slot=carousel-content] > div");
    expect(track?.className).toContain("-mt-4");
    expect(track?.className).toContain("flex-col");
  });

  it("starts embla in the left-to-right direction, on the horizontal axis", async () => {
    const api = await renderWithApi((setApi) => <Slides setApi={setApi} />);
    const options = api.internalEngine().options;
    expect(options.direction).toBe("ltr");
    expect(options.axis).toBe("x");
  });

  it("starts embla with direction rtl from the `dir` prop, and from Base UI's DirectionProvider", async () => {
    const fromProp = await renderWithApi((setApi) => <Slides dir="rtl" setApi={setApi} />);
    expect(fromProp.internalEngine().options.direction).toBe("rtl");
    expect(screen.getByRole("region").getAttribute("dir")).toBe("rtl");

    const fromProvider = await renderWithApi((setApi) => (
      <DirectionProvider direction="rtl">
        <Slides setApi={setApi} />
      </DirectionProvider>
    ));
    expect(fromProvider.internalEngine().options.direction).toBe("rtl");
  });

  it("lets the `dir` prop win over the provider, and `opts.direction` over both", async () => {
    const dirWins = await renderWithApi((setApi) => (
      <DirectionProvider direction="rtl">
        <Slides dir="ltr" setApi={setApi} />
      </DirectionProvider>
    ));
    expect(dirWins.internalEngine().options.direction).toBe("ltr");
    const optsWin = await renderWithApi((setApi) => (
      <Slides dir="rtl" opts={{ direction: "ltr" }} setApi={setApi} />
    ));
    expect(optsWin.internalEngine().options.direction).toBe("ltr");
  });

  it("scrolls with ArrowRight for the next slide and ArrowLeft for the previous (left to right)", async () => {
    const user = userEvent.setup();
    const api = await renderWithApi((setApi) => <Slides setApi={setApi} />);
    const next = vi.spyOn(api, "scrollNext");
    const previous = vi.spyOn(api, "scrollPrev");
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Product 1" }));
    await user.keyboard("{ArrowRight}");
    expect(next).toHaveBeenCalledTimes(1);
    expect(previous).not.toHaveBeenCalled();
    await user.keyboard("{ArrowLeft}");
    expect(previous).toHaveBeenCalledTimes(1);
  });

  it("swaps the horizontal arrow keys in a right-to-left carousel", async () => {
    const user = userEvent.setup();
    const api = await renderWithApi((setApi) => <Slides dir="rtl" setApi={setApi} />);
    const next = vi.spyOn(api, "scrollNext");
    const previous = vi.spyOn(api, "scrollPrev");
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(next).toHaveBeenCalledTimes(1);
    await user.keyboard("{ArrowRight}");
    expect(previous).toHaveBeenCalledTimes(1);
  });

  it("answers ArrowDown and ArrowUp in a vertical carousel, not the horizontal keys", async () => {
    const user = userEvent.setup();
    const api = await renderWithApi((setApi) => <Slides orientation="vertical" setApi={setApi} />);
    expect(api.internalEngine().options.axis).toBe("y");
    const next = vi.spyOn(api, "scrollNext");
    const previous = vi.spyOn(api, "scrollPrev");
    await user.tab();
    await user.keyboard("{ArrowRight}{ArrowLeft}");
    expect(next).not.toHaveBeenCalled();
    expect(previous).not.toHaveBeenCalled();
    await user.keyboard("{ArrowDown}");
    expect(next).toHaveBeenCalledTimes(1);
    await user.keyboard("{ArrowUp}");
    expect(previous).toHaveBeenCalledTimes(1);
  });

  it("scrolls from its Next button, which is reached with Tab after the three slides' links", async () => {
    const user = userEvent.setup();
    const api = await renderWithApi((setApi) => <Slides setApi={setApi} />);
    const next = vi.spyOn(api, "scrollNext");
    const nextButton = screen.getByRole("button", { name: "Next slide" });
    // Without layout, embla finds nothing to scroll to, so the buttons start disabled; enable them
    // the way embla does when it reports a scrollable list.
    act(() => {
      vi.spyOn(api, "canScrollNext").mockReturnValue(true);
      api.emit("reInit");
    });
    await waitFor(() => expect((nextButton as HTMLButtonElement).disabled).toBe(false));
    // Three product links, then the previous button (disabled at the start: skipped), then next.
    for (let tab = 0; tab < 4; tab++) await user.tab();
    expect(document.activeElement).toBe(nextButton);
    expect(nextButton.className).toContain("focus-visible:ring-ring");
    await user.keyboard("{Enter}");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("draws no dark variant, no tinted ring and no physical direction", () => {
    render(<Slides />);
    const classes = [...document.querySelectorAll("[class]")]
      .map((element) => element.getAttribute("class"))
      .join(" ");
    expect(classes).not.toMatch(/(?:^|[\s:])dark:/);
    expect(classes).not.toMatch(/ring-[a-z-]+\/\d/);
    expect(classes).not.toMatch(/(?:^|\s)(?:-?[ml][lr]-\d|-?left-|-?right-)/);
  });

  it.each(longLabels)(
    "takes a long %s slide and button label without a clipping class",
    (_locale, strings) => {
      render(<Slides previous={strings.action} next={strings.linkLabel} />);
      for (const name of [strings.action, strings.linkLabel]) {
        expect(screen.getByRole("button", { name }).className).not.toMatch(CLIPPING_CLASSES);
      }
      for (const element of document.querySelectorAll("[data-slot^=carousel]")) {
        expect(element.className).not.toMatch(CLIPPING_CLASSES);
      }
    },
  );
});
