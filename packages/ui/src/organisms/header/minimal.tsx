// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4). The minimal header: the menu button
// at every width (the drawer is the navigation, SPEC §9.4's "hamburger on every breakpoint"), the
// logo in the middle and the cart at the end, and never a MegaMenu. The search link stays beside
// the cart when the shop has a search page, since a shop with no search anywhere is not a shop a
// visitor can use; the account links, the wishlist and the market switcher are only in the drawer,
// where this variant keeps them (a header this plain has no row for them). The row is the same
// grid as the other variants' below `lg`, with the same padding, at every width.
import {
  HeaderCart,
  HeaderLogo,
  HeaderMenuButton,
  HeaderSearch,
  HeaderTop,
  headerClass,
  type HeaderProps,
} from "./parts";

function HeaderMinimal(props: HeaderProps) {
  return (
    <>
      <HeaderTop header={props} />
      <header
        data-slot="header"
        data-variant="minimal"
        className={headerClass(props.sticky, props.className)}
      >
        <div className="mx-auto grid w-full max-w-page grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-x-2 px-2 py-1 sm:px-4 lg:px-6 lg:py-2">
          <HeaderMenuButton header={props} className="col-start-1 row-start-1 justify-self-start" />
          <HeaderLogo
            header={props}
            className="col-start-2 row-start-1 justify-self-center text-center"
          />
          <div className="col-start-3 row-start-1 flex items-center justify-end gap-1 lg:gap-2">
            <HeaderSearch header={props} />
            <HeaderCart header={props} />
          </div>
        </div>
      </header>
    </>
  );
}

export { HeaderMinimal };
export type { HeaderProps };
