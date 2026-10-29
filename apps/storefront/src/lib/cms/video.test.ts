import { describe, expect, it } from "vitest";
import { parseVideoUrl } from "./video";

describe("parseVideoUrl", () => {
  it("reads YouTube's addresses", () => {
    const video = { provider: "youtube", videoId: "aqz-KE-bpKQ" };
    for (const url of [
      "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      "https://youtube.com/watch?v=aqz-KE-bpKQ&t=30s",
      "https://m.youtube.com/watch?v=aqz-KE-bpKQ",
      "https://youtu.be/aqz-KE-bpKQ?si=x",
      "https://www.youtube.com/embed/aqz-KE-bpKQ",
      "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
      "https://www.youtube.com/shorts/aqz-KE-bpKQ",
      " https://www.youtube.com/live/aqz-KE-bpKQ ",
    ])
      expect(parseVideoUrl(url), url).toEqual(video);
  });

  it("reads Vimeo's addresses", () => {
    const video = { provider: "vimeo", videoId: "76979871" };
    for (const url of [
      "https://vimeo.com/76979871",
      "https://www.vimeo.com/76979871",
      "https://vimeo.com/channels/staffpicks/76979871",
      "https://player.vimeo.com/video/76979871?h=abc",
    ])
      expect(parseVideoUrl(url), url).toEqual(video);
  });

  it("refuses another host, http, a missing or malformed id, and what is not a URL", () => {
    for (const url of [
      "https://example.com/watch?v=aqz-KE-bpKQ",
      "http://www.youtube.com/watch?v=aqz-KE-bpKQ",
      "https://www.youtube.com/watch",
      "https://www.youtube.com/watch?v=short",
      "https://www.youtube.com/watch?v=aqz-KE-bpKQ%22onload",
      "https://www.youtube.com/channel/UC123",
      "https://vimeo.com/about",
      "https://youtube.com.evil.example/watch?v=aqz-KE-bpKQ",
      "javascript:alert(1)",
      "not a url",
      "",
    ])
      expect(parseVideoUrl(url), url).toBeNull();
  });
});
