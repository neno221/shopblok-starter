/**
 * `value` as an absolute URL whose protocol is one of `protocols`, normalised (`URL.href`), or
 * `undefined` for anything else: a relative path, `javascript:`, `data:`, a blank or a non-string.
 */
export function safeLink(value: unknown, protocols: readonly string[]): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  try {
    const url = new URL(value.trim());
    return protocols.includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The e-mail's link (its button), which must be an absolute `http(s)` URL: anything else throws, so
 * an e-mail never goes out with a link that does nothing or runs a script (D121).
 */
export function buttonLink(url: string): string {
  const href = safeLink(url, ["http:", "https:"]);
  if (href === undefined)
    throw new Error("@shopblok/emails: the e-mail's link must be an absolute http(s) URL.");
  return href;
}
