// D80: a page's address inside a market is its parents' slugs and its own, in the market's
// language. Payload's reads give each page's slug in that language (English's where it has none,
// by the fallback), so the addresses are worked out from the pages themselves; the breadcrumbs the
// admin keeps (`payload/nested-pages.ts`) are not read for them.

/** Pages nest at most this deep; a deeper chain (or a loop) has no address. */
export const MAX_PAGE_DEPTH = 10;

/**
 * A page's address inside a market (`/about/team`): its parents' slugs and its own, top level
 * first. `null` while one of them has no slug.
 */
export function pagePath(slugs: readonly unknown[]): string | null {
  if (slugs.length === 0) return null;
  const segments: string[] = [];
  for (const slug of slugs) {
    if (typeof slug !== "string" || slug === "") return null;
    segments.push(slug);
  }
  return `/${segments.join("/")}`;
}

/** A page as the address read takes it: its id, slug and title in the language read, its parent. */
export type PageNode = {
  id: number;
  slug?: string | null;
  title?: string | null;
  parent?: number | { id: number } | null;
};

/** A page with an address: the address, its title and its parent's id. */
export type PagePlace = { path: string; title: string; parent: number | null };

/** Every readable page's address in one language, both ways (JSON, so a cache entry can hold it). */
export type PagePaths = {
  /** The address → the page's id. */
  byPath: Record<string, number>;
  /** The page's id → its address, title and parent. */
  byId: Record<string, PagePlace>;
};

/**
 * A page reference as the page's id (a page's `parent`, `site-settings.homepage`): the id, or a
 * populated document's; `null` for none (`null`, `undefined`, the admin's `""`). The one helper for
 * it, in the shop and in the admin's hooks (PR 98 review, item 6).
 */
export function pageIdOf(value: unknown): number | null {
  const id = typeof value === "object" && value !== null ? (value as { id?: unknown }).id : value;
  if (typeof id === "number") return id;
  return typeof id === "string" && /^\d+$/.test(id) ? Number(id) : null;
}

const parentId = (node: PageNode): number | null => pageIdOf(node.parent);

/**
 * The addresses of `nodes` (one language's read). A page whose parent is not among them (not
 * published, or deleted) has none, nor do the pages under it: its address would lead to a page a
 * visitor cannot see. Two pages with one address (sibling slugs are unique in a language, but a
 * page with no slug of its own reads English's) go to the first in `nodes`' order.
 */
export function pagePaths(nodes: readonly PageNode[]): PagePaths {
  const byNode = new Map(nodes.map((node) => [node.id, node]));
  const known = new Map<number, string | null>();
  const pathOf = (node: PageNode): string | null => {
    const cached = known.get(node.id);
    if (cached !== undefined) return cached;
    const slugs: unknown[] = [];
    const seen = new Set<number>();
    let current: PageNode | undefined = node;
    while (current !== undefined) {
      if (seen.has(current.id) || seen.size >= MAX_PAGE_DEPTH) {
        known.set(node.id, null);
        return null;
      }
      seen.add(current.id);
      slugs.unshift(current.slug);
      const parent = parentId(current);
      if (parent === null) break;
      current = byNode.get(parent);
      if (current === undefined) {
        known.set(node.id, null);
        return null;
      }
    }
    const path = pagePath(slugs);
    known.set(node.id, path);
    return path;
  };
  const paths: PagePaths = { byPath: {}, byId: {} };
  for (const node of nodes) {
    const path = pathOf(node);
    if (path === null || path in paths.byPath) continue;
    paths.byPath[path] = node.id;
    paths.byId[String(node.id)] = { path, title: node.title ?? "", parent: parentId(node) };
  }
  return paths;
}

/**
 * The address a `[...slug]` route's segments name, or `null` for one no page can have. Next may
 * hand the segments encoded (`%CF%83…`) or not; a slug has no `%` of its own (`slugProblem`).
 */
export function pathFromSegments(segments: readonly string[]): string | null {
  const decoded: string[] = [];
  for (const segment of segments) {
    try {
      decoded.push(decodeURIComponent(segment));
    } catch {
      return null;
    }
  }
  return pagePath(decoded);
}

/**
 * A page's parents with an address, top level first (its breadcrumbs' trail after Home). Empty for
 * a top-level page or one `paths` does not know.
 */
export function pageAncestors(paths: PagePaths, id: number): (PagePlace & { id: number })[] {
  const ancestors: (PagePlace & { id: number })[] = [];
  let parent = paths.byId[String(id)]?.parent ?? null;
  while (parent !== null && ancestors.length < MAX_PAGE_DEPTH) {
    const place = paths.byId[String(parent)];
    if (place === undefined) break;
    ancestors.unshift({ id: parent, ...place });
    parent = place.parent;
  }
  return ancestors;
}

/** An address as a URL path: each slug percent-encoded (`/%CF%83…`), as a category's handles are. */
export function encodePagePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}
