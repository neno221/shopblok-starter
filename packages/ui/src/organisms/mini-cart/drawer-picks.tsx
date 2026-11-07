// Ours (T85, SETUP.md "Cart variants (T85)"; M5 plan §1a, D99, D101). The `mini-cart` family's
// `drawer-picks` member: the drawer (`./drawer.tsx`, T39's, unchanged) with up to four products to
// add under the lines, "You may also like", from the `templates` global's `picks` (the shop
// resolves them on the server for the market and leaves out what the cart already holds). Each
// pick is a row: its picture (decoration: its name says what it is), its name as the link to its
// page, its price (PriceBlock), and its own form to the cart: the variant (a hidden field for a
// product with one, a native select named for the product for one with more), one of it, and an
// "Add" button named for the product. The form posts `variantId` and `quantity` to `addAction` (the
// shop's island sends it to the drawer's action, which answers the drawer again with the line in it
// and the pick gone). No picks (none found, or every one in the cart) draws the drawer alone. A
// server component, as the drawer is (D49): the body it hands the drawer's client part is rendered
// here, so the member adds no client code.
import type { CartPick } from "@shopblok/registry/contracts";
import { formatMessage } from "@shopblok/i18n/format";
import { Button } from "@shopblok/ui/atoms/button";
import { Image } from "@shopblok/ui/atoms/image";
import { Link } from "@shopblok/ui/atoms/link";
import { NativeSelect, NativeSelectOption } from "@shopblok/ui/atoms/native-select";
import { PriceBlock } from "@shopblok/ui/molecules/price-block";
import { ImageOffIcon } from "lucide-react";
import { useId } from "react";
import type * as React from "react";
import { CartDrawerClient, type CartDrawerClientProps } from "./drawer-client";
import { cartDrawerParts, type CartDrawerProps } from "./drawer";

type FormAction = React.ComponentProps<"form">["action"];

// `Link` takes whatever `next/link` takes, which an app with typed routes narrows to its own
// routes; a pick's `href` is a string the app built.
type LinkHref = React.ComponentProps<typeof Link>["href"];

// A URL is posted; a function is left to React, which posts it as a server action.
const method = (action: FormAction) => (typeof action === "function" ? undefined : "post");

/** One pick: its picture, its name, its price and its form to the cart. */
function PickRow({
  pick,
  copy,
  locale,
  addAction,
  prefetch,
}: {
  pick: CartPick;
  copy: CartDrawerProps["copy"];
  locale: string;
  addAction?: FormAction;
  prefetch?: boolean | null;
}) {
  const words = copy.drawer;
  const [only] = pick.choices;
  return (
    <li data-slot="cart-pick" data-product={pick.id} className="flex min-w-0 gap-3">
      <div className="w-16 shrink-0">
        {pick.image === undefined ? (
          <div
            aria-hidden="true"
            className="flex aspect-[4/5] w-full items-center justify-center rounded-md bg-muted text-muted-foreground"
          >
            <ImageOffIcon className="size-5" />
          </div>
        ) : (
          <Image src={pick.image.src} alt="" sizes="64px" ratio="portrait" radius="md" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          href={pick.href as LinkHref}
          prefetch={prefetch}
          data-slot="cart-pick-title"
          className="-my-1.5 flex min-h-11 items-center text-sm leading-snug font-medium text-foreground no-underline hover:underline"
        >
          <span className="line-clamp-2 min-w-0 wrap-anywhere">{pick.title}</span>
        </Link>
        <PriceBlock price={pick.price} copy={copy.price} locale={locale} size="sm" />
        <form
          data-slot="cart-pick-add"
          action={addAction}
          method={method(addAction)}
          className="mt-1 flex min-w-0 flex-wrap items-center gap-2"
        >
          {pick.choices.length === 1 && only !== undefined ? (
            <input type="hidden" name="variantId" value={only.variantId} />
          ) : (
            <NativeSelect
              name="variantId"
              aria-label={formatMessage(words.pickChoice, { product: pick.title }, locale)}
              className="max-w-full min-w-0 flex-1 basis-32"
            >
              {pick.choices.map((choice) => (
                <NativeSelectOption key={choice.variantId} value={choice.variantId}>
                  {choice.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
          <input type="hidden" name="quantity" value="1" />
          <Button
            type="submit"
            variant="outline"
            aria-label={formatMessage(words.pickAddLabel, { product: pick.title }, locale)}
            className="shrink-0"
          >
            {words.pickAdd}
          </Button>
        </form>
      </div>
    </li>
  );
}

/** The picks under the lines: a section named by its heading, a list of rows. */
function CartPicks({
  picks,
  copy,
  locale,
  addAction,
  prefetch,
}: Pick<CartDrawerProps, "copy" | "locale" | "addAction" | "prefetch"> & {
  picks: readonly CartPick[];
}) {
  const titleId = useId();
  return (
    <section
      data-slot="cart-picks"
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col gap-3 border-t py-4"
    >
      <h3 id={titleId} className="text-sm leading-snug font-semibold">
        {copy.drawer.picksTitle}
      </h3>
      <ul role="list" className="flex min-w-0 flex-col gap-4">
        {picks.map((pick) => (
          <PickRow
            key={pick.id}
            pick={pick}
            copy={copy}
            locale={locale}
            addAction={addAction}
            prefetch={prefetch}
          />
        ))}
      </ul>
    </section>
  );
}

/** The member's parts: the drawer's, with the picks after its body and its own `variant`. */
function cartDrawerPicksParts(drawer: CartDrawerProps): CartDrawerClientProps {
  const parts = cartDrawerParts(drawer);
  const held = new Set(drawer.cart.lines.map((line) => line.productId));
  // What the cart holds is no pick, whatever the caller passed (the contract refuses it too).
  const picks = (drawer.picks ?? []).filter((pick) => !held.has(pick.id));
  return {
    ...parts,
    variant: "drawer-picks",
    body:
      picks.length === 0 ? (
        parts.body
      ) : (
        <>
          {parts.body}
          <CartPicks
            picks={picks}
            copy={drawer.copy}
            locale={drawer.locale}
            addAction={drawer.addAction}
            prefetch={drawer.prefetch}
          />
        </>
      ),
  };
}

/** The drawer with its picks: its parts, drawn by the drawer's client part. */
function MiniCartDrawerPicks(props: CartDrawerProps) {
  return <CartDrawerClient {...cartDrawerPicksParts(props)} />;
}

export { MiniCartDrawerPicks, cartDrawerPicksParts };
