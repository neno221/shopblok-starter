import type { VideoProvider } from "@shopblok/registry/contracts";

/** A YouTube video's id: eleven letters, digits, `-` or `_`. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
/** A Vimeo video's id: digits. */
const VIMEO_ID = /^\d{1,12}$/;

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
export function parseVideoUrl(value: string): { provider: VideoProvider; videoId: string } | null {
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
    // vimeo.com/76979871, vimeo.com/channels/staffpicks/76979871, player.vimeo.com/video/76979871
    const id = segments.findLast((segment) => VIMEO_ID.test(segment));
    return id === undefined ? null : { provider: "vimeo", videoId: id };
  }
  return null;
}

function youtube(id: string | undefined) {
  return id !== undefined && YOUTUBE_ID.test(id)
    ? { provider: "youtube" as const, videoId: id }
    : null;
}
