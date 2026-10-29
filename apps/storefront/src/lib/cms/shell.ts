import type {
  AnnouncementBar,
  Category,
  FooterColumn,
  Image,
  Link,
  NavItem,
  PaymentBrand,
  SocialLink,
} from "@shopblok/registry/contracts";
import { PaymentBrand as PaymentBrands, SocialNetwork } from "@shopblok/registry/contracts";
import { titleTemplateOf, type SeoFields } from "../seo/meta";
import { siteOrigin } from "../site-origin";
import type {
  Footer as FooterGlobal,
  Header as HeaderGlobal,
  SiteSetting,
} from "../../payload-types";
import type { Market, MarketMap } from "../markets/types";
import { toNavigation } from "../navigation";
import { text } from "../text";
import {
  announcementFor,
  footerColumns,
  SITE,
  type FooterVariant,
  type HeaderVariant,
} from "../site";
import { resolveLink, type InternalPaths, type LinkValue } from "./link";
import { encodePagePath, type PagePaths } from "./page-path";
import { CMS_PATHS } from "./paths";
import { newsletterTarget, type NewsletterTarget } from "./resolve/forms";

// The shell's content (D78): the `header`, `footer` and `site-settings` globals as the header and
// footer components take them. A global that was never saved, or could not be read (no database at
// build time, D73), gives `site.ts`'s values, so a fresh clone and a build without `.env` look as
// M3 did. Once an editor saves one, its values are the shop's: a message they empty takes the bar
// away rather than bringing `site.ts`'s back. Only the store's name has a floor, since every
// header and footer needs one.

/** The header variants the shell draws (`components/shell/header.tsx`). */
const HEADER_VARIANTS: readonly HeaderVariant[] = [
  "classic",
  "centered",
  "two-tier",
  "mega-menu",
  "minimal",
];
const FOOTER_VARIANTS: readonly FooterVariant[] = [
  "multi-column",
  "newsletter-first",
  "minimal",
  "wordmark",
  "two-tier",
];

export type ShellSettings = {
  storeName: string;
  /** The site's logo: the header's and the footer's unless the header has its own. */
  logo?: Image;
  /** A page's `<title>`: `%s` is the page's own title. */
  titleTemplate: string;
  /** The site's description and picture: a page's when neither it nor its template has one (D82). */
  seo: SeoFields;
  /** The shop as its `Organization` JSON-LD describes it, beside its name and logo (D82). */
  organization: { legalName?: string; email?: string; telephone?: string };
};

export type ShellHeader = {
  design: HeaderVariant;
  announcement?: AnnouncementBar;
  navigation: NavItem[];
  utilities: { search: boolean; account: boolean; marketSwitcher: boolean };
  sticky: boolean;
  logo?: Image;
};

export type ShellFooter = {
  design: FooterVariant;
  columns: FooterColumn[];
  social: SocialLink[];
  legalLinks: Link[];
  paymentIcons: PaymentBrand[];
  marketSwitcher: boolean;
  copyright: string;
  logo?: Image;
  /** The signup (T67, D81): the form to post to and the privacy page; none without a form. */
  newsletter?: NewsletterTarget;
};

/** What the links of the header and footer resolve against: the market and its catalog. */
export type ShellContext = {
  market: Market;
  map: MarketMap;
  /** A path inside the market as its public URL. */
  url: (path: string) => string;
  /** Medusa's category tree, as the shell has it (`toCategories`). */
  categories: readonly Category[];
  /** The market language's page addresses (`readPagePaths`, T65); none without a database. */
  pages?: PagePaths | null;
};

type Saved = { updatedAt?: string | null } | null | undefined;

/** Whether an editor (or the seed) has saved the global: an unsaved one reads as `{}`. */
export const isSaved = (global: Saved): boolean =>
  typeof global?.updatedAt === "string" && global.updatedAt !== "";

/** An upload as an image the shell can draw: `undefined` for an id, a missing file or no size. */
export function mediaImage(value: unknown): Image | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const media = value as { url?: unknown; alt?: unknown; width?: unknown; height?: unknown };
  const { url, width, height } = media;
  if (typeof url !== "string" || url === "") return undefined;
  if (typeof width !== "number" || typeof height !== "number" || width <= 0 || height <= 0)
    return undefined;
  return { src: mediaSrc(url), alt: typeof media.alt === "string" ? media.alt : "", width, height };
}

/**
 * An upload's URL as the shop links it: a path (`/api/media/file/hero.webp`) when the file is on
 * the shop's own origin. Payload writes it absolute, with `serverURL` (`siteOrigin()`), and
 * `next/image` refuses an absolute URL on a host it has not been told of: `next dev` fails the
 * page, and in production `/_next/image` answers 400, a broken picture (PR 98, the seeded hero).
 * A file on another host (a storage adapter's) is left as it is.
 */
export function mediaSrc(url: string, origin: string = siteOrigin()): string {
  try {
    const parsed = new URL(url, origin);
    return parsed.origin === origin ? `${parsed.pathname}${parsed.search}` : url;
  } catch {
    return url;
  }
}

/**
 * The internal paths for this market's shell: `CMS_PATHS`, with a category's whole path of
 * handles (`/categories/apparel/tops`) from Medusa's tree, which its Payload document lacks, and
 * a page's address in the market's language from `pages` (T65): a page that has none there (not
 * published, or under one that is not) gets no link. Without `pages` (no database), `CMS_PATHS`'.
 */
export function shellPaths(
  categories: readonly Category[],
  pages?: PagePaths | null,
): InternalPaths {
  const full = new Map<string, string[]>();
  const walk = (nodes: readonly Category[], path: string[]) => {
    for (const node of nodes) {
      const handles = [...path, node.handle];
      if (!full.has(node.handle)) full.set(node.handle, handles);
      walk(node.children, handles);
    }
  };
  walk(categories, []);
  return {
    ...CMS_PATHS,
    categories: (doc) => {
      const fallback = CMS_PATHS["categories"]?.(doc) ?? null;
      const handles = fallback === null ? undefined : full.get(String(doc["handle"]));
      return handles === undefined
        ? fallback
        : `/categories/${handles.map(encodeURIComponent).join("/")}`;
    },
    ...(pages === null || pages === undefined
      ? {}
      : {
          pages: (doc) => {
            const path = pages.byId[String(doc["id"])]?.path;
            return path === undefined ? null : encodePagePath(path);
          },
        }),
  };
}

/** A `link` field's value as a link with a label, or `undefined` (no label, nowhere to go). */
function linkOf(value: LinkValue | null | undefined, context: ShellContext, paths: InternalPaths) {
  const resolved = resolveLink(value, { market: context.market, map: context.map, paths });
  const label = text(resolved?.label);
  if (resolved === null || label === undefined) return undefined;
  return { label, href: resolved.href, ...(resolved.newTab ? { external: true } : {}) };
}

const linksOf = (
  rows: readonly { link?: LinkValue | null }[] | null | undefined,
  context: ShellContext,
  paths: InternalPaths,
): Link[] =>
  (rows ?? []).flatMap((row) => {
    const resolved = linkOf(row.link, context, paths);
    return resolved === undefined ? [] : [resolved];
  });

export function settingsFrom(global: SiteSetting | null | undefined): ShellSettings {
  const saved = isSaved(global);
  const storeName = (saved ? text(global?.storeName) : undefined) ?? SITE.storeName;
  const logo = saved ? mediaImage(global?.logo) : undefined;
  const template = saved ? text(global?.seo?.titleTemplate) : undefined;
  const description = saved ? text(global?.seo?.description) : undefined;
  const image = saved ? mediaImage(global?.seo?.image) : undefined;
  const organization = saved ? global?.organization : undefined;
  const legalName = text(organization?.legalName);
  const email = text(organization?.email);
  const telephone = text(organization?.telephone);
  return {
    storeName,
    ...(logo === undefined ? {} : { logo }),
    titleTemplate: titleTemplateOf(template, storeName),
    seo: {
      ...(description === undefined ? {} : { description }),
      ...(image === undefined ? {} : { image }),
    },
    organization: {
      ...(legalName === undefined ? {} : { legalName }),
      ...(email === undefined ? {} : { email }),
      ...(telephone === undefined ? {} : { telephone }),
    },
  };
}

/** A manual navigation item (`header.navigation.items[]`) as the header's, or none when it has no links left. */
function navItemOf(
  item: NonNullable<NonNullable<HeaderGlobal["navigation"]>["items"]>[number],
  context: ShellContext,
  paths: InternalPaths,
): NavItem | undefined {
  if (item.kind === "link") {
    const resolved = linkOf(item.link, context, paths);
    return resolved === undefined
      ? undefined
      : { kind: "link", label: resolved.label, href: resolved.href };
  }
  const label = text(item.label);
  if (label === undefined) return undefined;
  if (item.kind === "dropdown") {
    const items = linksOf(item.links, context, paths);
    return items.length === 0 ? undefined : { kind: "dropdown", label, items };
  }
  const columns = (item.columns ?? []).flatMap((column) => {
    const title = text(column.title);
    const links = linksOf(column.links, context, paths);
    return title === undefined || links.length === 0 ? [] : [{ title, links }];
  });
  return columns.length === 0 ? undefined : { kind: "megaMenu", label, columns, featured: [] };
}

export function headerFrom(
  global: HeaderGlobal | null | undefined,
  context: ShellContext,
  settings: ShellSettings,
): ShellHeader {
  const { market, categories } = context;
  if (!isSaved(global) || global == null) {
    return {
      design: SITE.header,
      announcement: announcementFor(market.language),
      navigation: toNavigation(categories),
      utilities: { search: true, account: true, marketSwitcher: true },
      sticky: SITE.stickyHeader,
      ...(settings.logo === undefined ? {} : { logo: settings.logo }),
    };
  }
  const paths = shellPaths(categories, context.pages);
  const message = text(global.announcement?.message);
  const announcementLink = linkOf(global.announcement?.link, context, paths);
  const navigation =
    global.navigation?.source === "manual"
      ? (global.navigation.items ?? []).flatMap((item) => {
          const resolved = navItemOf(item, context, paths);
          return resolved === undefined ? [] : [resolved];
        })
      : toNavigation(categories);
  const logo = mediaImage(global.logo) ?? settings.logo;
  return {
    design: HEADER_VARIANTS.includes(global.design) ? global.design : SITE.header,
    ...(message === undefined
      ? {}
      : {
          announcement: {
            messages: [
              { message, ...(announcementLink === undefined ? {} : { link: announcementLink }) },
            ],
            dismissible: global.announcement?.dismissible !== false,
          },
        }),
    navigation,
    utilities: {
      search: global.utilities?.search !== false,
      account: global.utilities?.account !== false,
      marketSwitcher: global.utilities?.marketSwitcher !== false,
    },
    sticky: global.sticky !== false,
    ...(logo === undefined ? {} : { logo }),
  };
}

/** The copyright line: `{year}` filled in; empty gives `© {year} {store}`. */
export function copyrightLine(value: unknown, storeName: string, year: number): string {
  return (text(value) ?? `© {year} ${storeName}`).replaceAll("{year}", String(year));
}

export function footerFrom(
  global: FooterGlobal | null | undefined,
  context: ShellContext,
  settings: ShellSettings,
  year: number,
): ShellFooter {
  const { market, categories, url } = context;
  const topLevel: Link[] = categories.map((category) => ({
    label: category.title,
    href: category.href,
  }));
  const logo = settings.logo === undefined ? {} : { logo: settings.logo };
  if (!isSaved(global) || global == null) {
    return {
      design: SITE.footer,
      columns: footerColumns(market.language, topLevel, url),
      social: [],
      legalLinks: [],
      paymentIcons: [],
      marketSwitcher: true,
      copyright: copyrightLine(undefined, settings.storeName, year),
      ...logo,
    };
  }
  const paths = shellPaths(categories, context.pages);
  const columns = (global.columns ?? []).flatMap((column) => {
    const title = text(column.title);
    const links = [
      ...(column.categories ? topLevel : []),
      ...linksOf(column.links, context, paths),
    ];
    return title === undefined || links.length === 0 ? [] : [{ title, links }];
  });
  const networks = new Set<string>();
  const social = (global.social ?? []).flatMap((row) => {
    const network = SocialNetwork.safeParse(row.network);
    const href = text(row.url);
    if (!network.success || href === undefined || !href.startsWith("https://")) return [];
    if (networks.has(network.data)) return [];
    networks.add(network.data);
    return [{ network: network.data, href }];
  });
  const paymentIcons = [
    ...new Set(
      (global.paymentIcons ?? []).flatMap((brand) => {
        const parsed = PaymentBrands.safeParse(brand);
        return parsed.success ? [parsed.data] : [];
      }),
    ),
  ];
  const newsletter = newsletterTarget(
    global.newsletter?.form,
    global.newsletter?.privacy as LinkValue | null | undefined,
    { market, map: context.map, paths },
  );
  return {
    design: FOOTER_VARIANTS.includes(global.design) ? global.design : SITE.footer,
    columns: columns.slice(0, 5),
    social: social.slice(0, 8),
    legalLinks: linksOf(global.legalLinks, context, paths).slice(0, 6),
    paymentIcons: paymentIcons.slice(0, 8),
    marketSwitcher: global.marketSwitcher !== false,
    copyright: copyrightLine(global.copyright, settings.storeName, year),
    ...logo,
    ...(newsletter === undefined ? {} : { newsletter }),
  };
}
