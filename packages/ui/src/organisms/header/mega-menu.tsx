// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4 and §13). The mega menu header: two
// rows from `lg` (1024 px). The first has the logo, a wide search and, at the end, the account and
// wishlist links, the market switcher and the cart; the second is the navigation, a row of its own
// as wide as the header's content, so a mega menu's panel (as wide as the navigation, MegaMenu's
// rule) spans the header. The wide search is the search link drawn as a field (the icon and the
// word "Search" in a bordered box), and an icon alone below `lg`: one link at every width. It is a
// link and not the SearchField molecule because the shared props carry no SearchField copy (the
// same props go to every variant, which is what lets a shop switch variant in the CMS), and
// because the search overlay of T37 will open from this very place and replace both. Below `lg` the
// header is the other variants' row, with the navigation in the drawer. The end of the first row is
// a wrapper that `lg:contents` dissolves, so the search, the utilities and the cart become the
// row's own grid cells without a second copy of any of them in the markup.
import {
  HeaderAccountIcons,
  HeaderCart,
  HeaderLogo,
  HeaderMenuButton,
  HeaderNav,
  HeaderSwitcher,
  HeaderTop,
  HeaderWideSearch,
  headerClass,
  type HeaderProps,
} from "./parts";

function HeaderMegaMenu(props: HeaderProps) {
  return (
    <>
      <HeaderTop header={props} />
      <header
        data-slot="header"
        data-variant="mega-menu"
        className={headerClass(props.sticky, props.className)}
      >
        <div className="mx-auto grid w-full max-w-page grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-x-2 px-2 py-1 sm:px-4 lg:grid-cols-[auto_minmax(0,1fr)_auto_auto] lg:gap-x-6 lg:px-6 lg:py-2">
          <HeaderMenuButton
            header={props}
            className="col-start-1 row-start-1 justify-self-start lg:hidden"
          />
          <HeaderLogo
            header={props}
            className="col-start-2 row-start-1 justify-self-center text-center lg:col-start-1 lg:max-w-64 lg:justify-self-start lg:text-start"
          />
          <div className="col-start-3 row-start-1 flex items-center justify-end gap-1 lg:contents">
            <HeaderWideSearch
              header={props}
              className="lg:col-start-2 lg:row-start-1 lg:max-w-2xl lg:justify-self-center"
            />
            <div className="hidden items-center gap-2 lg:col-start-3 lg:row-start-1 lg:flex">
              <HeaderAccountIcons header={props} />
              <HeaderSwitcher header={props} className="hidden lg:inline-flex" />
            </div>
            <div className="flex lg:col-start-4 lg:row-start-1">
              <HeaderCart header={props} />
            </div>
          </div>
        </div>
        {props.navigation.length === 0 ? null : (
          <div data-slot="header-nav-row" className="hidden border-t lg:block">
            <div data-slot="header-row" className="mx-auto w-full max-w-page px-6">
              <HeaderNav header={props} className="w-full" />
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export { HeaderMegaMenu };
export type { HeaderProps };
