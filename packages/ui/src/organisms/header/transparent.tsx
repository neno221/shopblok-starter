// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4 and §13). The transparent header: the
// classic layout (`classic.tsx`) drawn over the page's hero. The `<header>` has no height and the
// row is laid over what follows it (`absolute inset-x-0 top-0` inside it), so the hero starts at the
// top of the page and the header covers its top edge, sticky or not; a sticky one is a zero-height
// element that sticks, with the row hanging from it. Over the picture the text is light and sits on
// a scrim: the `overlay` token (60 % black) under the whole row, then a strip that fades out under
// it, so the text keeps its contrast on any photograph (white on 60 % black over a white photo is
// 5.7:1; the token pair is `overlay` and `overlay-foreground`). Inside the row the tokens are
// remapped for the transparent look (the foreground and the ring become the light colour, and the
// hover ground becomes a darker scrim), so every component in it, the atoms and MegaMenu among
// them, keeps its own contrast pairing with no class of ours on it; the one exception is the
// switcher's trigger, an outline button on the page's white, whose text stays dark. Once the page
// scrolls or a menu or the drawer opens (`transparent-client.tsx`) the row is the classic one: the
// background token, normal text, a rule under it, no scrim. `solid` pins the look. The server
// render is the transparent look; nothing in this file reads the scroll.
import { cn } from "@shopblok/ui/lib/utils";
import { HeaderTransparentFrame } from "./transparent-client";
import {
  HeaderAccountIcons,
  HeaderCart,
  HeaderLogo,
  HeaderMenuButton,
  HeaderNav,
  HeaderSearch,
  HeaderSwitcher,
  HeaderTop,
  type HeaderProps,
} from "./parts";

type HeaderTransparentProps = HeaderProps & {
  /**
   * Pins the look. `true`: solid from the start, for a page with no hero under the header. `false`:
   * transparent whatever the page does (the design system's picture). Unset: transparent at the top
   * of the page, solid once it scrolls or a menu or the drawer opens.
   */
  solid?: boolean;
};

// The classes that make the row solid or transparent, one group each, from the frame's
// `data-solid`. Written in full so that Tailwind finds each class.
const solidLook =
  "group-data-[solid=true]/header:border-b group-data-[solid=true]/header:bg-background group-data-[solid=true]/header:text-foreground";
const transparentLook =
  "group-data-[solid=false]/header:text-overlay-foreground group-data-[solid=false]/header:[--foreground:var(--overlay-foreground)] group-data-[solid=false]/header:[--muted-foreground:var(--overlay-foreground)] group-data-[solid=false]/header:[--muted:var(--overlay)] group-data-[solid=false]/header:[--ring:var(--overlay-foreground)]";

function HeaderTransparent({ solid, ...props }: HeaderTransparentProps) {
  return (
    <>
      <HeaderTop header={props} />
      <HeaderTransparentFrame solid={solid} sticky={props.sticky} className={props.className}>
        <div
          data-slot="header-surface"
          className={cn(
            "absolute inset-x-0 top-0 transition-colors duration-(--duration-base) motion-reduce:transition-none",
            solidLook,
            transparentLook,
          )}
        >
          <div
            aria-hidden="true"
            data-slot="header-scrim"
            className="pointer-events-none absolute inset-0 bg-overlay group-data-[solid=true]/header:hidden"
          >
            <div className="absolute inset-x-0 top-full h-8 bg-linear-to-b from-overlay to-transparent" />
          </div>
          <div className="relative mx-auto grid w-full max-w-page grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-x-2 px-2 py-1 sm:px-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-x-6 lg:px-6 lg:py-2">
            <HeaderMenuButton
              header={props}
              className="col-start-1 row-start-1 justify-self-start lg:hidden"
            />
            <HeaderLogo
              header={props}
              className="col-start-2 row-start-1 justify-self-center text-center lg:col-start-1 lg:max-w-64 lg:justify-self-start lg:text-start"
            />
            <HeaderNav
              header={props}
              className="hidden lg:col-start-2 lg:row-start-1 lg:flex lg:min-w-0"
            />
            <div className="col-start-3 row-start-1 flex items-center justify-end gap-1 lg:gap-2">
              <HeaderSearch header={props} />
              <HeaderAccountIcons header={props} />
              <HeaderSwitcher
                header={props}
                className="hidden lg:inline-flex *:data-[slot=market-switcher-trigger]:text-primary"
              />
              <HeaderCart header={props} />
            </div>
          </div>
        </div>
      </HeaderTransparentFrame>
    </>
  );
}

export { HeaderTransparent };
export type { HeaderProps, HeaderTransparentProps };
