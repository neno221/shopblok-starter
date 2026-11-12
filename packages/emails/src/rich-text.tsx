import type { CSSProperties, ReactNode } from "react";
import { safeLink } from "./links";
import { theme } from "./theme";
import type { LexicalNode, RichTextDocument } from "./types";
import { fillVariables } from "./variables";

// Payload's rich text (a Lexical document) in an e-mail, twice: as React elements for the HTML part
// and as plain text for the text part (D121). Both read the same nodes as T70's `lexicalToText`:
// paragraphs, headings and quotes are blocks, lists (nested too) are lists, a link is its text and
// its URL, line breaks and tabs are kept. Anything else gives its text. The `{{variables}}` are
// filled in each text node before either is drawn, so a value is a text node: React escapes it in
// the HTML, and the text part has it as written.

const childrenOf = (node: LexicalNode): LexicalNode[] =>
  Array.isArray(node.children) ? (node.children as LexicalNode[]) : [];

const isDocument = (value: unknown): value is RichTextDocument => {
  const root = (value as { root?: unknown } | null | undefined)?.root;
  return typeof root === "object" && root !== null;
};

/** The document's text, or `""` when it is not Lexical JSON or has no text. */
const hasText = (node: LexicalNode): boolean =>
  (node.type === "text" && typeof node.text === "string" && node.text.trim() !== "") ||
  childrenOf(node).some(hasText);

/** Whether `value` is a Lexical document with any text in it. */
export function richTextHasText(value: unknown): value is RichTextDocument {
  return isDocument(value) && hasText(value.root);
}

/** Paragraphs of plain text as a Lexical document, the way the seed writes the body. */
export function paragraphs(texts: readonly string[]): RichTextDocument {
  return {
    root: {
      type: "root",
      children: texts.map((text) => ({
        type: "paragraph",
        children: [{ type: "text", text, format: 0 }],
      })),
    },
  };
}

/**
 * A copy of the document with `{{name}}` filled in every text node, for the names in `allowed`
 * (one pass per node: a value's own braces stay). A link's URL is not filled.
 */
export function fillRichText(
  document: RichTextDocument,
  allowed: readonly string[],
  values: Readonly<Record<string, string | undefined>>,
): RichTextDocument {
  const fill = (node: LexicalNode): LexicalNode => {
    const filled: LexicalNode = { ...node };
    if (node.type === "text" && typeof node.text === "string")
      filled.text = fillVariables(node.text, allowed, values);
    if (Array.isArray(node.children)) filled.children = childrenOf(node).map(fill);
    return filled;
  };
  return { root: fill(document.root) };
}

const linkUrl = (node: LexicalNode): unknown =>
  typeof node.fields?.url === "string" ? node.fields.url : node.url;

// ---------------------------------------------------------------------------------------------
// Plain text

function inlineText(node: LexicalNode): string {
  if (node.type === "text" && typeof node.text === "string") return node.text;
  if (node.type === "linebreak") return "\n";
  if (node.type === "tab") return "\t";
  const text = childrenOf(node).map(inlineText).join("");
  if (node.type === "link" || node.type === "autolink") {
    const url = linkUrl(node);
    return typeof url === "string" && url !== "" && url !== text ? `${text} (${url})` : text;
  }
  return text;
}

function listText(node: LexicalNode, depth: number): string[] {
  const indent = "  ".repeat(depth);
  let number = 0;
  return childrenOf(node).flatMap((item) => {
    const nested = childrenOf(item).filter((child) => child.type === "list");
    const own = childrenOf(item).filter((child) => child.type !== "list");
    const lines = nested.flatMap((child) => listText(child, depth + 1));
    // A list item that holds only a nested list is Lexical's way to indent; it gets no marker.
    if (own.length === 0) return lines;
    number++;
    const marker = node.listType === "number" ? `${number}.` : "-";
    return [`${indent}${marker} ${own.map(inlineText).join("")}`, ...lines];
  });
}

/**
 * A Lexical document (Payload's `richText` JSON) as plain text: each paragraph, heading or quote
 * a block, lists as `-` or `1.` lines, a link as its text followed by its URL. Anything else
 * gives its text. Not Lexical JSON gives `""`.
 */
export function lexicalToText(value: unknown): string {
  if (!isDocument(value)) return "";
  return childrenOf(value.root)
    .map((block) =>
      block.type === "list" ? listText(block, 0).join("\n") : inlineText(block).trim(),
    )
    .filter((block) => block !== "")
    .join("\n\n");
}

// ---------------------------------------------------------------------------------------------
// HTML (React elements)

const paragraph: CSSProperties = {
  margin: "0 0 16px",
  fontSize: "16px",
  lineHeight: "24px",
  color: theme.foreground,
};

const headingStyles: Record<string, CSSProperties> = {
  h2: { margin: "24px 0 12px", fontSize: "20px", lineHeight: "28px", fontWeight: 600 },
  h3: { margin: "20px 0 8px", fontSize: "18px", lineHeight: "26px", fontWeight: 600 },
  h4: { margin: "16px 0 8px", fontSize: "16px", lineHeight: "24px", fontWeight: 600 },
};

const BOLD = 1;
const ITALIC = 2;
const UNDERLINE = 8;

function textElement(node: LexicalNode, key: number): ReactNode {
  const text = node.text as string;
  const format = typeof node.format === "number" ? node.format : 0;
  // Plain text is a string: React escapes it, and it needs no element of its own.
  if ((format & (BOLD | ITALIC | UNDERLINE)) === 0) return text;
  let element: ReactNode = text;
  if (format & UNDERLINE) element = <u>{element}</u>;
  if (format & ITALIC) element = <em>{element}</em>;
  if (format & BOLD) element = <strong key={key}>{element}</strong>;
  else element = <span key={key}>{element}</span>;
  return element;
}

function inlineElements(nodes: readonly LexicalNode[]): ReactNode[] {
  return nodes.map((node, key) => {
    if (node.type === "text" && typeof node.text === "string") return textElement(node, key);
    if (node.type === "linebreak") return <br key={key} />;
    if (node.type === "tab") return "\t";
    const children = inlineElements(childrenOf(node));
    if (node.type === "link" || node.type === "autolink") {
      // Only an http(s) or mailto link is drawn as one; anything else is its text (D121).
      const href = safeLink(linkUrl(node), ["http:", "https:", "mailto:"]);
      return href === undefined ? (
        <span key={key}>{children}</span>
      ) : (
        <a key={key} href={href} style={{ color: theme.foreground, textDecoration: "underline" }}>
          {children}
        </a>
      );
    }
    return <span key={key}>{children}</span>;
  });
}

function listElement(node: LexicalNode, key: number): ReactNode {
  const items = childrenOf(node).map((item, index) => {
    const nested = childrenOf(item).filter((child) => child.type === "list");
    const own = childrenOf(item).filter((child) => child.type !== "list");
    return (
      <li
        key={index}
        style={
          own.length === 0 ? { listStyleType: "none" } : { margin: "0 0 4px", lineHeight: "24px" }
        }
      >
        {inlineElements(own)}
        {nested.map(listElement)}
      </li>
    );
  });
  const style: CSSProperties = { margin: "0 0 16px", paddingInlineStart: "24px", ...paragraph };
  return node.listType === "number" ? (
    <ol key={key} style={style}>
      {items}
    </ol>
  ) : (
    <ul key={key} style={style}>
      {items}
    </ul>
  );
}

function blockElement(node: LexicalNode, key: number): ReactNode {
  if (node.type === "list") return listElement(node, key);
  const children = inlineElements(childrenOf(node));
  if (node.type === "heading") {
    // The e-mail's own heading is its h1; the body's headings start at h2 (the editor offers h2 to h4).
    const tag = node.tag === "h3" || node.tag === "h4" ? node.tag : "h2";
    const Tag = tag;
    return (
      <Tag key={key} style={{ ...headingStyles[tag], color: theme.foreground }}>
        {children}
      </Tag>
    );
  }
  if (node.type === "quote")
    return (
      <blockquote
        key={key}
        style={{
          ...paragraph,
          margin: "0 0 16px",
          paddingInlineStart: "16px",
          borderInlineStart: `4px solid ${theme.border}`,
          color: theme.mutedForeground,
        }}
      >
        {children}
      </blockquote>
    );
  return (
    <p key={key} style={paragraph}>
      {children}
    </p>
  );
}

/** A Lexical document as the e-mail's body: its blocks, without the empty ones. */
export function RichText({ document }: { document: RichTextDocument }) {
  return <>{childrenOf(document.root).filter(hasText).map(blockElement)}</>;
}
