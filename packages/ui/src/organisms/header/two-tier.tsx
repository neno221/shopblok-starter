// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4). The two-tier header: a utility bar
// above the main row, holding the market switcher at the start and, from `lg` (1024 px), the account
// and wishlist links at the end as words with their glyphs (a bar has the room for words, which an
// icon does not give); the main row below it is the logo, the navigation, the search link and the
// cart. The bar is there at every width, and the switcher in it keeps its two forms: a popover from
// `md` (768 px), a bottom sheet below it, so the sheet SPEC §9.4 asks of every variant is one tap
// from the bar on a phone as well. Below `lg` the main row is the other variants' (the menu button,
// the logo, the search link and the cart) and the drawer's foot has the account links; it holds
// the switcher too, as it does in every variant. A bar with nothing to show at a width is not drawn.
import {
  HeaderAccountText,
  HeaderCart,
  HeaderLogo,
  HeaderMenuButton,
  HeaderNav,
  HeaderSearch,
  HeaderSwitcher,
  HeaderTop,
  drawerAccount,
  hasSwitcher,
  headerClass,
  type HeaderProps,
} from "./parts";

function HeaderTwoTier(props: HeaderProps) {
  const switcher = hasSwitcher(props);
  const hasLinks = drawerAccount(props).length > 0;
  return (
    <>
      <HeaderTop header={props} />
      <header
        data-slot="header"
        data-variant="two-tier"
        className={headerClass(props.sticky, props.className)}
      >
        {switcher || hasLinks ? (
          <div
            data-slot="header-bar"
            className={
              switcher
                ? "border-b bg-secondary text-secondary-foreground"
                : "hidden border-b bg-secondary text-secondary-foreground lg:block"
            }
          >
            <div className="mx-auto flex w-full max-w-page items-center justify-between gap-x-2 px-2 py-1 sm:px-4 lg:px-6">
              <HeaderSwitcher header={props} />
              {hasLinks ? (
                <div className="ms-auto hidden items-center gap-1 lg:flex">
                  <HeaderAccountText header={props} className="hover:bg-background" />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
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
            <HeaderCart header={props} />
          </div>
        </div>
      </header>
    </>
  );
}

export { HeaderTwoTier };
export type { HeaderProps };
