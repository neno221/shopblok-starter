import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { VideoSection } from "./video";
import { embedUrl } from "./video-embed";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;

describe("VideoSection", () => {
  it.each(LOCALES)(
    "draws an embed as a poster and a play button, with no frame, in %s",
    (locale) => {
      const { embed } = sectionFixtures[locale].video;
      const { container } = render(
        <VideoSection
          {...embed}
          copy={{ video: catalogs[locale].sections.video }}
          locale={htmlLang[locale]}
        />,
      );
      expect(container.querySelector("iframe")).toBeNull();
      const button = screen.getByRole("button");
      expect(button.getAttribute("aria-label")).toContain(embed.title);
      expect(button.textContent).toBe(catalogs[locale].sections.video.playLabel);
      expect(container.textContent).toContain("YouTube");
      expect(container.querySelector("figcaption")?.textContent).toBe(embed.caption);
    },
  );

  it("loads the player only after a click, focuses it, and names it by the title", async () => {
    const { embed } = sectionFixtures.en.video;
    const { container } = render(
      <VideoSection {...embed} copy={{ video: catalogs.en.sections.video }} locale="en-US" />,
    );
    await userEvent.click(screen.getByRole("button"));
    const frame = container.querySelector("iframe");
    expect(frame?.getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1&rel=0",
    );
    expect(frame?.getAttribute("title")).toBe(embed.title);
    expect(document.activeElement).toBe(frame);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("builds YouTube's privacy-enhanced address and Vimeo's with Do Not Track", () => {
    expect(embedUrl("youtube", "abc_123")).toBe(
      "https://www.youtube-nocookie.com/embed/abc_123?autoplay=1&rel=0",
    );
    expect(embedUrl("vimeo", "76979871")).toBe(
      "https://player.vimeo.com/video/76979871?autoplay=1&dnt=1",
    );
    expect(embedUrl("vimeo", "a/b")).toBe("https://player.vimeo.com/video/a%2Fb?autoplay=1&dnt=1");
  });

  it("plays an upload in the browser's player, loading nothing first, with the page's captions on", () => {
    const { file } = sectionFixtures.el.video;
    const { container } = render(
      <VideoSection {...file} copy={{ video: catalogs.el.sections.video }} locale="el-CY" />,
    );
    const video = container.querySelector("video");
    expect(video?.getAttribute("preload")).toBe("none");
    expect(video?.hasAttribute("autoplay")).toBe(false);
    expect(video?.hasAttribute("controls")).toBe(true);
    expect(video?.getAttribute("aria-label")).toBe(file.title);
    const tracks = [...container.querySelectorAll("track")];
    expect(tracks.map((track) => track.getAttribute("srclang"))).toEqual(["en", "el", "de", "fr"]);
    expect(tracks.every((track) => track.getAttribute("kind") === "captions")).toBe(true);
    expect(tracks.filter((track) => track.hasAttribute("default")).map((t) => t.srclang)).toEqual([
      "el",
    ]);
  });

  it("turns no captions on when none is in the page's language (PR 95 review, item 6)", () => {
    const { file } = sectionFixtures.en.video;
    if (file.source.kind !== "file") throw new Error("not a file");
    const { container } = render(
      <VideoSection
        {...file}
        source={{ ...file.source, tracks: file.source.tracks.slice(2) }}
        copy={{ video: catalogs.en.sections.video }}
        locale="en-US"
      />,
    );
    expect(container.querySelectorAll("track")).toHaveLength(2);
    expect(container.querySelectorAll("track[default]")).toHaveLength(0);
  });

  it("adds an unlisted Vimeo video's hash to its player's address (PR 95 review, item 4)", () => {
    expect(embedUrl("vimeo", "76979871", "abc123def0")).toBe(
      "https://player.vimeo.com/video/76979871?autoplay=1&dnt=1&h=abc123def0",
    );
    expect(embedUrl("vimeo", "76979871")).toBe(
      "https://player.vimeo.com/video/76979871?autoplay=1&dnt=1",
    );
  });
});
