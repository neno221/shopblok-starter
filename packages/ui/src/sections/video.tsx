// Ours (T63, SETUP.md "Blocks (T63)"; SPEC §7.4 `video`, D79, WCAG 1.2.2 and 2.2.2). A video the
// shop uploaded, or one on YouTube or Vimeo. An upload plays in the browser's own player, with a
// captions track per language (the page's language on by default) and nothing loaded before the
// visitor presses play (`preload="none"`, the poster instead). An embed is `VideoEmbed`: a poster
// and a play button, and the provider's player only after a click. Neither plays by itself. The
// player is named by the video's title; the editor's caption is under it. A server component; the
// embed is its client island.
import { formatMessage } from "@shopblok/i18n";
import type { VideoSection as VideoSectionData } from "@shopblok/registry/contracts";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import { VideoEmbed } from "@shopblok/ui/sections/video-embed";

/** How a provider is named on the page. Brand names, the same in every language. */
const providerNames = { youtube: "YouTube", vimeo: "Vimeo" } as const;

type VideoSectionProps = VideoSectionData & {
  copy: Pick<SectionsCopy, "video">;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. Its language's captions are on. */
  locale: string;
  className?: string;
};

function VideoSection({
  settings,
  heading,
  title,
  caption,
  poster,
  source,
  copy,
  locale,
  className,
}: VideoSectionProps) {
  const language = locale.split("-")[0]?.toLowerCase();
  const defaultTrack =
    source.kind === "file"
      ? (source.tracks.find((track) => track.srclang === language) ?? source.tracks[0])
      : undefined;
  return (
    <SectionFrame
      settings={settings}
      slot="video-section"
      data-source={source.kind}
      className={className}
      innerClassName="flex flex-col gap-6"
    >
      {heading === undefined ? null : <SectionHeading>{heading}</SectionHeading>}
      <figure className="flex min-w-0 flex-col gap-2">
        {source.kind === "file" ? (
          <video
            controls
            preload="none"
            playsInline
            poster={poster?.src}
            aria-label={title}
            className="aspect-video w-full rounded-lg bg-muted"
          >
            <source src={source.src} type={source.type} />
            {source.tracks.map((track) => (
              <track
                key={track.srclang}
                kind="captions"
                src={track.src}
                srcLang={track.srclang}
                label={track.label}
                default={track === defaultTrack}
              />
            ))}
          </video>
        ) : (
          <VideoEmbed
            provider={source.provider}
            videoId={source.videoId}
            title={title}
            poster={poster}
            copy={{
              playLabel: copy.video.playLabel,
              play: formatMessage(copy.video.play, { title }, locale),
              provider: formatMessage(
                copy.video.provider,
                { provider: providerNames[source.provider] },
                locale,
              ),
            }}
          />
        )}
        {caption === undefined ? null : (
          <figcaption className="text-sm text-muted-foreground wrap-anywhere">{caption}</figcaption>
        )}
      </figure>
    </SectionFrame>
  );
}

export { VideoSection };
export type { VideoSectionProps };
