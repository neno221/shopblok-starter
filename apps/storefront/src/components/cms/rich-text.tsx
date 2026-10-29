import {
  RichText,
  type JSXConverters,
  type JSXConvertersFunction,
} from "@payloadcms/richtext-lexical/react";
import type { ReactNode } from "react";
import { isSafeLinkUrl, resolveLink, type LinkValue } from "../../lib/cms/link";
import type { LexicalState, ResolveContext } from "../../lib/cms/resolve/sections";

type LinkFields = {
  linkType?: "custom" | "internal";
  url?: string | null;
  doc?: { relationTo: string; value: unknown } | null;
  newTab?: boolean | null;
};

/** A Lexical link's fields as a `link` field's value, so both resolve by one rule (SPEC §7.5). */
function linkValue(fields: LinkFields): LinkValue {
  return fields.linkType === "internal"
    ? { type: "reference", reference: fields.doc ?? null, newTab: fields.newTab ?? false }
    : { type: "custom", url: fields.url ?? null, newTab: fields.newTab ?? false };
}

/**
 * Lexical's converters with the link rule of the `link` field: an internal link goes to the
 * document's URL in the current market, a custom one through the same check (a path in the market,
 * https, mailto, tel), and a link that cannot be resolved (a deleted product, `javascript:`) is
 * drawn as its text. A new tab gets `rel="noopener noreferrer"`.
 */
function converters(context: ResolveContext): JSXConvertersFunction {
  const anchor = (fields: LinkFields, children: ReactNode) => {
    const resolved = resolveLink(linkValue(fields), context);
    if (resolved === null) return <>{children}</>;
    return (
      <a href={resolved.href} {...(resolved.newTab ? { target: "_blank", rel: resolved.rel } : {})}>
        {children}
      </a>
    );
  };
  return ({ defaultConverters }) =>
    ({
      ...defaultConverters,
      link: ({ node, nodesToJSX }) =>
        anchor(node.fields as LinkFields, nodesToJSX({ nodes: node.children })),
      autolink: ({ node, nodesToJSX }) => {
        const children = nodesToJSX({ nodes: node.children });
        const url = (node.fields as LinkFields).url ?? "";
        return isSafeLinkUrl(url) ? (
          anchor({ ...(node.fields as LinkFields), linkType: "custom" }, children)
        ) : (
          <>{children}</>
        );
      },
    }) as JSXConverters;
}

/**
 * A block's rich text (T63) as plain elements, for a section's `Prose`: Payload's `RichText`
 * without its container, with the market's link rule. A server component.
 */
export function CmsRichText({ data, context }: { data: LexicalState; context: ResolveContext }) {
  return <RichText data={data as never} converters={converters(context)} disableContainer />;
}
