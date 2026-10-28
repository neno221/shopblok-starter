// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4). The centered header: from `lg`
// (1024 px) up, the logo sits in the middle of the navigation, which is split around it (MegaMenu's
// `splitAt` and `center`: one list, the logo an item between the halves), and the
// utilities and the cart are in a row of their own above it, at the end. The choice is the
// second row. With the utilities in the navigation's row the navigation's landmark would be as wide
// as what is left of the row, the logo would sit in the middle of that and not of the header, and at
// 1024 px each half would have about 200 px for its items. In a row of their own the navigation has
// the whole header, the logo sits between the halves near the middle of the page (in it exactly
// when the halves are as wide as each other), and a mega menu's panel is as wide as the header's
// content. The row above costs the header 44 px of height, which a centered header
// accepts. Below `lg` it is the other variants' row: the menu button, the logo and the end.
// The logo is in the markup twice, once for each layout (`lg:hidden` below, inside the navigation
// from `lg`); the hidden one is `display: none`, so a reader meets it once. The cart is once.
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

function HeaderCentered(props: HeaderProps) {
  const { navigation } = props;
  const hasNav = navigation.length > 0;
  return (
    <>
      <HeaderTop header={props} />
      <header
        data-slot="header"
        data-variant="centered"
        className={headerClass(props.sticky, props.className)}
      >
        <div
          data-slot="header-row"
          className="mx-auto grid w-full max-w-page grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-x-2 px-2 py-1 sm:px-4 lg:flex lg:flex-col lg:gap-y-1 lg:px-6 lg:py-2"
        >
          <HeaderMenuButton
            header={props}
            className="col-start-1 row-start-1 justify-self-start lg:hidden"
          />
          <HeaderLogo
            header={props}
            className={
              hasNav
                ? "col-start-2 row-start-1 justify-self-center text-center lg:hidden"
                : "col-start-2 row-start-1 justify-self-center text-center lg:self-center"
            }
          />
          <div className="col-start-3 row-start-1 flex items-center justify-end gap-1 lg:w-full lg:gap-2">
            <HeaderSearch header={props} />
            <HeaderAccountIcons header={props} />
            <HeaderSwitcher header={props} compact />
            <HeaderCart header={props} />
          </div>
          <HeaderNav
            header={props}
            className="hidden lg:flex lg:w-full"
            splitAt={Math.ceil(navigation.length / 2)}
            center={<HeaderLogo header={props} className="justify-center px-4 text-center" />}
          />
        </div>
      </header>
    </>
  );
}

export { HeaderCentered };
export type { HeaderProps };
