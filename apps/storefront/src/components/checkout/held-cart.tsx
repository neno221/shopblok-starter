import { EmptyState } from "@shopblok/ui/molecules/empty-state";
import { LockKeyholeIcon } from "lucide-react";
import { SHELL_PREFETCH } from "../../lib/site";

// M7 D144 (T109): what the cart page and the checkout draw when the cart cookie names a customer's
// cart and this visitor is not signed in as that customer (a session that expired, or another
// shopper on a shared computer). Medusa keeps the cart's payment secrets back and refuses its
// writes, so the shop shows neither its lines nor a payment: only the way to sign in, which comes
// back here (`?next=`). A plain link, so it works without scripts. The cookie stays until the
// visitor signs in (as that customer: the cart goes on; as anyone else: `login` drops it) or adds
// something (a new cart replaces it).

export type HeldCartProps = {
  words: { title: string; text: string; signIn: string };
  /** The sign-in page, with `next` back to the page that drew this. */
  signInHref: string;
};

export function HeldCart({ words, signInHref }: HeldCartProps) {
  return (
    <main
      id="main"
      data-slot="held-cart"
      className="mx-auto w-full max-w-7xl min-w-0 px-4 py-8 md:px-6 md:py-12 lg:px-8"
    >
      <EmptyState
        icon={LockKeyholeIcon}
        title={words.title}
        text={words.text}
        action={{ label: words.signIn, href: signInHref }}
        headingLevel={2}
        prefetch={SHELL_PREFETCH}
      />
    </main>
  );
}
