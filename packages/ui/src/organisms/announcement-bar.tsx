// Ours (T35, SETUP.md "Navigation and headers (T35)"; D44, D49). The strip above the header: one
// message, or up to five shown in turn, each with an optional link (SPEC §7.3, `announcementBar`).
// The server part, a component with no state: it makes the words (each message's position, "2 of
// 3", in the page's language) and renders each message and its link, then hands them to
// `AnnouncementBarClient` (`announcement-bar-client.tsx`), which holds the shown message, the timer
// and the controls. The client part imports no formatter and no catalog, so a bar costs the browser
// its logic and not the message formatter. It formats with `@shopblok/i18n/format` and not the
// package's index, so a client parent that imports this file (the only kind that can pass
// `onDismiss`, a function) does not pull the four catalogs along.
//
// The messages are the shop's content and are drawn as given: they wrap, never truncate (a long
// German or Greek message makes a taller bar, and every message shares one grid cell so the bar
// does not change height as they rotate). A link is a 44 px target of its own (D32), set after the
// text or under it when the text takes the whole row. A link marked `external` in the contract
// stays in the same tab: the bar's copy has no "opens in a new tab" note (WCAG 3.2.5), so opening a
// second tab without saying so is not offered. The rotation, the pause control and what a reader
// who prefers reduced motion gets are in the client part's header.
import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import type { AnnouncementBar as AnnouncementBarContent } from "@shopblok/registry/contracts";
import { Link } from "@shopblok/ui/atoms/link";
import type { ComponentProps } from "react";
import { AnnouncementBarClient, type AnnouncementSlide } from "./announcement-bar-client";

/** Seconds each message stays when the shop does not say. */
const DEFAULT_ROTATE_SECONDS = 6;

type AnnouncementBarProps = AnnouncementBarContent & {
  /** The wording, from the catalog's `organisms.announcementBar`. */
  copy: Messages["organisms"]["announcementBar"];
  /** The market's `<html lang>`, for `formatMessage`. */
  locale: string;
  /**
   * next/link's `prefetch` for each message's link. Unset, Next prefetches a link when it comes into
   * view; the design system passes `false` because the pages do not exist before M3.
   */
  prefetch?: boolean | null;
  /** Starts paused (the design system's states). A reader who prefers reduced motion gets it paused anyway. */
  defaultPaused?: boolean;
  /** The message shown first (the design system's states). */
  defaultIndex?: number;
  /**
   * Called after the reader closes the bar, for a page that remembers it. A function cannot cross
   * from a server component to a client one, so only a client parent can pass it.
   */
  onDismiss?: () => void;
  className?: string;
};

// `next/link` takes whatever an app with typed routes narrows its `href` to; a message's is a string
// the shop wrote (the same cast as CartButton's).
type LinkHref = ComponentProps<typeof Link>["href"];

function AnnouncementBar({
  messages,
  rotateSeconds,
  dismissible,
  copy,
  locale,
  prefetch,
  defaultPaused,
  defaultIndex,
  onDismiss,
  className,
}: AnnouncementBarProps) {
  const total = messages.length;
  // Nothing to say: no strip, rather than an empty one.
  if (total === 0) return null;
  const slides: AnnouncementSlide[] = messages.map((announcement, index) => ({
    id: String(index),
    position: formatMessage(copy.position, { current: index + 1, total }, locale),
    content: (
      <>
        <span data-slot="announcement-bar-text" className="min-w-0 px-2 py-2 wrap-break-word">
          {announcement.message}
        </span>
        {announcement.link === undefined ? null : (
          <Link
            variant="standalone"
            data-slot="announcement-bar-link"
            href={announcement.link.href as LinkHref}
            prefetch={prefetch}
            className="min-w-11 justify-center text-sm font-medium text-primary-foreground"
          >
            {announcement.link.label}
          </Link>
        )}
      </>
    ),
  }));
  return (
    <AnnouncementBarClient
      slides={slides}
      rotateSeconds={rotateSeconds ?? DEFAULT_ROTATE_SECONDS}
      dismissible={dismissible}
      labels={{
        region: copy.region,
        pause: copy.pause,
        play: copy.play,
        previous: copy.previous,
        next: copy.next,
        dismiss: copy.dismiss,
      }}
      defaultPaused={defaultPaused}
      defaultIndex={defaultIndex}
      onDismiss={onDismiss}
      className={className}
    />
  );
}

export { AnnouncementBar };
export type { AnnouncementBarProps };
