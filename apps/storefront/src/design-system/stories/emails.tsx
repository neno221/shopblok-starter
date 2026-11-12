// Ours (T98, SETUP.md "E-mails and Resend (T98)"; M6 D121, D122, D130). The stories of the
// e-mails: each layout of `@shopblok/emails` as a mail client draws it, with the seed's copy in the
// DS locale (`emailFixtures[ctx.locale]`). The DS draws the layout's frame inline, the same React
// elements `render()` turns into the e-mail's HTML (React's string renderer cannot run in a server
// component), so the picture is the e-mail's body. The address in the English fixtures has an
// apostrophe, which the e-mail shows once, escaped once.
import { emailFixtures, type EmailFixtureType } from "@shopblok/fixtures";
import {
  OrderTransferEmail,
  PasswordResetEmail,
  VerifyEmail,
  type EmailInput,
} from "@shopblok/emails";
import type { EntryId } from "@shopblok/registry";
import type { ReactElement } from "react";
import type { DsContext, DsState, DsStory } from "../types";

type Layout = (input: EmailInput) => ReactElement;

const input = (ctx: DsContext, type: EmailFixtureType): EmailInput =>
  emailFixtures[ctx.locale][type];

const A11Y = [
  'The frame is a layout table (`role="presentation"`), so a screen reader reads the e-mail as text, not as a table.',
  "The heading is the e-mail's only `h1`; the button and the plain link under it go to the same page, so a client that drops the button's styles still shows a link.",
  "The `<html>` has the shopper's `lang` and `dir`, and the text keeps a 4.5:1 contrast on the white card.",
];

/** The states every e-mail has: a long shop name, and the copy without its body text. */
function states(type: EmailFixtureType, Layout: Layout): readonly DsState[] {
  return [
    {
      id: "long-shop-name",
      label: "Long shop name",
      description: "The name in the header and the footer wraps; the card keeps its width.",
      render: (ctx) => (
        <Layout
          {...input(ctx, type)}
          shop={{ name: "Papadopoulou & Söhne Kunsthandwerk und Gartenbedarf International" }}
        />
      ),
    },
    {
      id: "no-body",
      label: "Without body text",
      description: "An editor emptied the body: the heading, the button and the link stay.",
      render: (ctx) => {
        const email = input(ctx, type);
        return (
          <Layout
            {...email}
            copy={{ ...email.copy, body: { root: { type: "root", children: [] } } }}
          />
        );
      },
    },
  ];
}

function story(type: EmailFixtureType, Layout: Layout, summary: string): DsStory {
  return {
    summary,
    a11y: A11Y,
    live: (ctx) => <Layout {...input(ctx, type)} />,
    states: states(type, Layout),
    statesLayout: "stack",
  };
}

export const emailStories = {
  "emails/verify-email": story(
    "verify-email",
    VerifyEmail,
    "The e-mail a new account gets: a button to the storefront's /verify page with the code.",
  ),
  "emails/password-reset": story(
    "password-reset",
    PasswordResetEmail,
    "The e-mail a forgotten password sends: a button to the storefront's reset page.",
  ),
  "emails/order-transfer": story(
    "order-transfer",
    OrderTransferEmail,
    "The e-mail that asks an order's owner to confirm moving a guest order into an account.",
  ),
} satisfies Partial<Record<EntryId, DsStory>>;
