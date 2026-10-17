// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4). The classic header: one row, with
// the logo at the start, the navigation after it, and at the end the utilities (the search link, the
// account and the wishlist, the market switcher) and the cart. Below `lg` (1024 px) the row is the
// menu button, the logo in the middle and the search link and cart at the end, and the navigation,
// the account links and the switcher are in the drawer (SPEC §9.4). A mega menu's panel is as wide
// as the navigation's own row, which is what MegaMenu does with the room its header gives it: the
// mega menu header (`mega-menu.tsx`) gives it the whole header. From `lg` the logo takes 16rem at
// most (`lg:max-w-64`): its column is `auto`, so a long store name would otherwise take its whole
// width and leave the navigation a few characters; it wraps in its own column instead. At 1024 px
// with every utility the navigation has about 350 px and its items may wrap to a second line, which
// is the cost of showing the switcher's full label there; they wrap and are never cut. What the
// variants share, and why the row is a grid, is in `parts.tsx`.
import {
  HeaderAccountIcons,
  HeaderCart,
  HeaderLogo,
  HeaderMenuButton,
  HeaderNav,
  HeaderSearch,
  HeaderSwitcher,
  HeaderTop,
  headerClass,
  type HeaderProps,
} from "./parts";

function HeaderClassic(props: HeaderProps) {
  return (
    <>
      <HeaderTop header={props} />
      <header
        data-slot="header"
        data-variant="classic"
        className={headerClass(props.sticky, props.className)}
      >
        <div data-slot="header-row" className="mx-auto grid w-full max-w-page grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-x-2 px-2 py-1 sm:px-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-x-6 lg:px-6 lg:py-2">
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
            <HeaderSwitcher header={props} className="hidden lg:inline-flex" />
            <HeaderCart header={props} />
          </div>
        </div>
      </header>
    </>
  );
}

export { HeaderClassic };
export type { HeaderProps };
