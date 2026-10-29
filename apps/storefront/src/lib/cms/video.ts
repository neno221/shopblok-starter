import type { VideoProvider } from "@shopblok/registry/contracts";

/** A YouTube video's id: eleven letters, digits, `-` or `_`. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
/** A Vimeo video's id: digits. */
const VIMEO_ID = /^\d{1,12}$/;
/** An unlisted Vimeo video's privacy hash: hex digits. */
const VIMEO_HASH = /^[0-9a-f]{6,20}$/i;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

/**
 * The video an editor's YouTube or Vimeo address points at (the `video` block, D79), or `null` for
 * anything else: another host, `http:`, or no id where the provider keeps it. The block stores the
 * address as the editor pasted it; the storefront embeds only the provider and the id, on the
 * provider's own player host (`embedUrl`), so the address itself never reaches the page.
 */
export function parseVideoUrl(
  value: string,
): { provider: VideoProvider; videoId: string; hash?: string } | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);
  if (host === "youtu.be") return youtube(segments[0]);
  if (YOUTUBE_HOSTS.has(host)) {
    if (segments[0] === "watch") return youtube(url.searchParams.get("v") ?? undefined);
    if (["embed", "shorts", "live", "v"].includes(segments[0] ?? "")) return youtube(segments[1]);
    return null;
  }
  if (VIMEO_HOSTS.has(host)) {
    // vimeo.com/76979871, vimeo.com/channels/staffpicks/76979871, player.vimeo.com/video/76979871;
    // an unlisted video's share link carries its hash after the id (vimeo.com/76979871/abc123def0)
    // or as `h` (player.vimeo.com/video/76979871?h=abc123def0), and its player needs it.
    const index = segments.findLastIndex((segment) => VIMEO_ID.test(segment));
    if (index === -1) return null;
    const hash = segments[index + 1] ?? url.searchParams.get("h") ?? undefined;
    if (hash !== undefined && !VIMEO_HASH.test(hash)) return null;
    return {
      provider: "vimeo",
      videoId: segments[index]!,
      ...(hash === undefined ? {} : { hash }),
    };
  }
  return null;
}

function youtube(id: string | undefined) {
  // `embed/videoseries?list=…` is a playlist, whose name happens to be eleven letters.
  return id !== undefined && id !== "videoseries" && YOUTUBE_ID.test(id)
    ? { provider: "youtube" as const, videoId: id }
    : null;
}
