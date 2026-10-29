// Ours (T63, SETUP.md "Blocks (T63)"; D79). A YouTube or Vimeo video as a poster with a play
// button, and the provider's player only after a click: until then the page requests nothing from
// the provider (no frame, no script, no thumbnail; the poster is the shop's own upload), so it sets
// no cookie and needs no consent. The click swaps the button for the player's frame, starts it and
// moves the focus to it, so a keyboard user lands in the player. A line under the poster names the
// provider. A client component: it holds whether the player was asked for.
"use client";

import type { Image as ImageData, VideoProvider } from "@shopblok/registry/contracts";
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { PlayIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** The player's address: YouTube's privacy-enhanced host, Vimeo's with Do Not Track. */
function embedUrl(provider: VideoProvider, videoId: string): string {
  const id = encodeURIComponent(videoId);
  return provider === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
    : `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1`;
}

type VideoEmbedProps = {
  provider: VideoProvider;
  videoId: string;
  /** The video's name: the frame's title. */
  title: string;
  poster?: ImageData;
  copy: {
    /** The button's visible words ("Play video"). */
    playLabel: string;
    /** Its accessible name, with the title ("Play video: How it is made"). */
    play: string;
    /** The line under it ("Plays from YouTube, which may set cookies."). */
    provider: string;
  };
  className?: string;
};

function VideoEmbed({ provider, videoId, title, poster, copy, className }: VideoEmbedProps) {
  const [playing, setPlaying] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (playing) frame.current?.focus();
  }, [playing]);
  return (
    <div
      data-slot="video-embed"
      data-provider={provider}
      className={cn("flex flex-col gap-2", className)}
    >
      {playing ? (
        <iframe
          ref={frame}
          src={embedUrl(provider, videoId)}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="aspect-video w-full rounded-lg border-0 bg-muted"
        />
      ) : (
        <button
          type="button"
          aria-label={copy.play}
          onClick={() => setPlaying(true)}
          className="group/play relative block aspect-video w-full overflow-hidden rounded-lg bg-muted text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          {poster === undefined ? null : (
            <Image
              src={poster.src}
              alt=""
              sizes="(min-width: 1280px) 1200px, 100vw"
              ratio="video"
              radius="none"
              className="absolute inset-0 size-full"
            />
          )}
          <span className="absolute inset-0 flex items-center justify-center p-4">
            <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-md transition-transform group-hover/play:scale-105 motion-reduce:transition-none">
              <PlayIcon aria-hidden="true" className="size-4 fill-current" />
              {copy.playLabel}
            </span>
          </span>
        </button>
      )}
      <p className="text-sm text-muted-foreground">{copy.provider}</p>
    </div>
  );
}

export { VideoEmbed, embedUrl };
export type { VideoEmbedProps };
