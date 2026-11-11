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
   * Pins the look. `true`: solid from the start, for a page with no hero under the header, and the
   * header then takes its row's height instead of lying over the page. `false`:
   * transparent whatever the page does (the design system's picture). Unset: transparent at the top
   * of the page, solid once it scrolls or a menu or the drawer opens. `"auto"` (the shop's, D103):
   * as unset over a page whose `<main>` opens with a picture behind its words
   * (`data-under-header`), and solid with its row's height on any other page, by CSS alone.
   */
  solid?: boolean | "auto";
};

// The classes that make the row solid or transparent, one group each, from the frame's
// `data-solid`. Written in full so that Tailwind finds each class.
// `header-solid:` and `header-clear:` are `@shopblok/ui/globals.css`' variants (D103, T80): the
// frame's `data-solid` of `true` or `false`, or `auto` with the page deciding.
const solidLook = "header-solid:border-b header-solid:bg-background header-solid:text-foreground";
const transparentLook =
  "header-clear:text-overlay-foreground header-clear:[--foreground:var(--overlay-foreground)] header-clear:[--muted-foreground:var(--overlay-foreground)] header-clear:[--muted:var(--overlay)] header-clear:[--ring:var(--overlay-foreground)]";

function HeaderTransparent({ solid, ...props }: HeaderTransparentProps) {
  return (
    <>
      <HeaderTop header={props} />
      <HeaderTransparentFrame solid={solid} sticky={props.sticky} className={props.className}>
        <div
          data-slot="header-surface"
          className={cn(
            "absolute inset-x-0 top-0 header-pinned:relative transition-colors duration-(--duration-base) motion-reduce:transition-none",
            solidLook,
            transparentLook,
          )}
        >
          {/* One gradient from the top: the `overlay` scrim behind the row's words, then fading
              out over 6rem below the row, so over a light picture there is no grey band ending in
              a line (W7 review item 15). The row's words stay on the full scrim. */}
          <div
            aria-hidden="true"
            data-slot="header-scrim"
            className="pointer-events-none absolute inset-x-0 top-0 h-[calc(100%+6rem)] bg-[linear-gradient(to_bottom,var(--color-overlay)_0%,var(--color-overlay)_40%,color-mix(in_srgb,var(--color-overlay)_55%,transparent)_62%,color-mix(in_srgb,var(--color-overlay)_20%,transparent)_82%,transparent_100%)] header-solid:hidden"
          />
          <div
            data-slot="header-row"
            className="relative mx-auto grid w-full max-w-page grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-x-2 px-2 py-1 sm:px-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-x-6 lg:px-6 lg:py-2"
          >
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
                compact
                className="lg:*:data-[slot=market-switcher-trigger]:text-primary"
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
