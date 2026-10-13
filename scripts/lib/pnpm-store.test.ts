import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installedPayloadVersions, installedVersions } from "./pnpm-store.ts";

let directory: string;
let store: string;
beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "pnpm-store-"));
  store = path.join(directory, "node_modules", ".pnpm");
  mkdirSync(store, { recursive: true });
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

/** A package as pnpm stores it: the real folder `<store>/<folder>/node_modules/<name>`. */
function stored(folder: string, name: string, version: string): string {
  const dir = path.join(store, folder, "node_modules", ...name.split("/"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name, version }));
  return dir;
}

/** A dependency of the package in `folder`, which pnpm links: a junction on Windows. */
function linked(folder: string, name: string, target: string): void {
  const at = path.join(store, folder, "node_modules", ...name.split("/"));
  mkdirSync(path.dirname(at), { recursive: true });
  symlinkSync(target, at, "junction");
}

const versions = (found: Map<string, Set<string>>) =>
  Object.fromEntries([...found].map(([name, set]) => [name, [...set].sort()]));

describe("installedPayloadVersions", () => {
  it("finds a package whose store folder pnpm shortened, as it does on Windows (W2, finding 4)", () => {
    // The folder names of W2's clone on Windows: cut at 60 characters, a hash at the end.
    stored(
      "@payloadcms+richtext-lexica_146f9205eb22aac36159a8b799510576",
      "@payloadcms/richtext-lexical",
      "3.90.2",
    );
    stored(
      "@payloadcms+db-postgres@3.9_791b5b7dad34954df6c5f8b5b773aa61",
      "@payloadcms/db-postgres",
      "3.90.2",
    );
    stored("payload@3.90.2_graphql@16.1_e37abf3b33e1914954bd68712c035083", "payload", "3.90.2");
    stored("@payloadcms+translations@3.90.2", "@payloadcms/translations", "3.90.2");
    expect(versions(installedPayloadVersions(store))).toEqual({
      "@payloadcms/db-postgres": ["3.90.2"],
      "@payloadcms/richtext-lexical": ["3.90.2"],
      "@payloadcms/translations": ["3.90.2"],
      payload: ["3.90.2"],
    });
  });

  it("reports every version of a package that the store holds", () => {
    stored(
      "@payloadcms+ui@3.90.2_@type_e59ebfb46fe0e0403ffe32f33880d158",
      "@payloadcms/ui",
      "3.90.2",
    );
    stored("@payloadcms+ui@3.91.0", "@payloadcms/ui", "3.91.0");
    expect(versions(installedPayloadVersions(store))).toEqual({
      "@payloadcms/ui": ["3.90.2", "3.91.0"],
    });
  });

  it("reads the package a folder holds, not the links to what it depends on", () => {
    stored("@payloadcms+ui@3.90.2", "@payloadcms/ui", "3.90.2");
    // A link to a copy outside the store (a global one, say): not this store's package.
    const elsewhere = path.join(directory, "elsewhere", "payload");
    mkdirSync(elsewhere, { recursive: true });
    writeFileSync(
      path.join(elsewhere, "package.json"),
      JSON.stringify({ name: "payload", version: "9.9.9" }),
    );
    linked("@payloadcms+ui@3.90.2", "payload", elsewhere);
    // pnpm's hoist folder holds links only.
    linked(
      "node_modules",
      "@payloadcms/ui",
      path.join(store, "@payloadcms+ui@3.90.2", "node_modules", "@payloadcms", "ui"),
    );
    expect(versions(installedPayloadVersions(store))).toEqual({ "@payloadcms/ui": ["3.90.2"] });
  });

  it("leaves other packages and the store's files alone", () => {
    stored("react@19.3.0", "react", "19.3.0");
    stored("@payloadcms-fake+x@1.0.0", "@payloadcms-fake/x", "1.0.0");
    writeFileSync(path.join(store, "lock.yaml"), "lockfileVersion: '9.0'\n");
    expect(installedPayloadVersions(store).size).toBe(0);
  });
});

describe("installedVersions", () => {
  it("looks for exact names and whole scopes", () => {
    stored("react@19.3.0", "react", "19.3.0");
    stored("@types+react@19.2.14", "@types/react", "19.2.14");
    stored("@types+node@22.20.5", "@types/node", "22.20.5");
    expect(versions(installedVersions(store, { names: ["react"], scopes: ["@types"] }))).toEqual({
      "@types/node": ["22.20.5"],
      "@types/react": ["19.2.14"],
      react: ["19.3.0"],
    });
  });
});
