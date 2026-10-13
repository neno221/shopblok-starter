// Reading pnpm's virtual store (`node_modules/.pnpm`) for `pnpm check:workspace` (T03).
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/** Which packages to look for: names (`payload`) and whole scopes (`@payloadcms`). */
export type StoreQuery = { names?: readonly string[]; scopes?: readonly string[] };

/** Whether `dir` is a real folder: in a store folder, a dependency is a link (a junction on Windows). */
function isRealFolder(dir: string): boolean {
  return lstatSync(dir, { throwIfNoEntry: false })?.isDirectory() === true;
}

/**
 * Every version of the packages `query` names that pnpm's virtual store holds, by package name.
 *
 * A store folder is named `<name>@<version>` and more (`@payloadcms+ui@3.90.2_react@19.3.0…`), but
 * pnpm cuts a long name and puts a hash at the end, and on Windows it cuts at 60 characters, so
 * `@payloadcms/richtext-lexical`'s folder is `@payloadcms+richtext-lexica_146f9205…` (W2, finding
 * 4). The name is therefore not read. Each folder holds its own package as a real folder at
 * `node_modules/<scope>/<name>`, beside links to the packages it depends on, and that folder's
 * `package.json` gives the version.
 */
export function installedVersions(store: string, query: StoreQuery): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>();
  for (const entry of readdirSync(store, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const modules = path.join(store, entry.name, "node_modules");
    const candidates = [...(query.names ?? [])];
    for (const scope of query.scopes ?? []) {
      if (!isRealFolder(path.join(modules, scope))) continue;
      for (const name of readdirSync(path.join(modules, scope)))
        candidates.push(`${scope}/${name}`);
    }
    for (const name of candidates) {
      const dir = path.join(modules, ...name.split("/"));
      if (!isRealFolder(dir)) continue;
      const manifest = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8")) as {
        version?: string;
      };
      if (manifest.version === undefined) continue;
      found.set(name, (found.get(name) ?? new Set()).add(manifest.version));
    }
  }
  return found;
}

/** Every installed copy of `payload` and `@payloadcms/*` in the store, by package name. */
export function installedPayloadVersions(store: string): Map<string, Set<string>> {
  return installedVersions(store, { names: ["payload"], scopes: ["@payloadcms"] });
}
