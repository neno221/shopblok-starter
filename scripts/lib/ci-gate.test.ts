import { describe, expect, it } from "vitest";
import {
  decideJobs,
  isDependencyFile,
  isDocs,
  outputLines,
  runtimeImports,
  sharedAreas,
  type Importer,
} from "./ci-gate.ts";

const pr = (files: string[], importers: Importer[] = []) =>
  decideJobs({ event: "pull_request", files, importers });
const jobs = ({
  e2e,
  designSystem,
  windows,
}: {
  e2e: boolean;
  designSystem: boolean;
  windows: boolean;
}) => ({
  e2e,
  designSystem,
  windows,
});

describe("decideJobs on a pull request", () => {
  it("runs neither e2e-smoke nor design-system for a docs-only change", () => {
    expect(jobs(pr(["docs/plans/M2.md", "README.md", "docs/adr/0005-x.md"]))).toEqual({
      e2e: false,
      designSystem: false,
      windows: false,
    });
  });

  it("runs design-system only for a change under packages/ui/src/molecules", () => {
    expect(jobs(pr(["packages/ui/src/molecules/price-block.tsx", "docs/SETUP.md"]))).toEqual({
      e2e: false,
      designSystem: true,
      windows: false,
    });
  });

  it("runs design-system only for the DS page's own files, its spec and its screenshots", () => {
    for (const file of [
      "packages/registry/src/index.ts",
      "packages/ui/src/primitives/dialog.tsx",
      "packages/ui/src/organisms/header/classic.tsx",
      "apps/storefront/src/design-system/stories/atoms.tsx",
      "apps/storefront/src/app/design-system/[locale]/(overview)/page.tsx",
      "apps/storefront/e2e/design-system.spec.ts",
      "apps/storefront/e2e/dev-console-ds.spec.ts",
      "apps/storefront/e2e/thumbnails.spec.ts",
      "apps/storefront/e2e/support/settle.ts",
      "apps/storefront/e2e/__screenshots__/design-system/atoms/button/en-375.png",
      "apps/storefront/public/registry/molecules/product-card-minimal.png",
    ]) {
      expect(jobs(pr([file])), file).toEqual({
        e2e: false,
        designSystem: true,
        windows: false,
      });
    }
  });

  it("runs both for a change under apps/storefront/src/lib", () => {
    expect(jobs(pr(["apps/storefront/src/lib/env.ts"]))).toEqual({
      e2e: true,
      designSystem: true,
      windows: false,
    });
  });

  it("runs both for the atoms, the tokens and the other shared packages", () => {
    for (const file of [
      "packages/ui/src/atoms/button.tsx",
      "packages/ui/tokens/shopblok.tokens.json",
      "packages/ui/src/styles/tokens.css",
      "packages/i18n/src/index.ts",
      "packages/fixtures/src/design-system.ts",
    ]) {
      expect(jobs(pr([file])), file).toEqual({
        e2e: true,
        designSystem: true,
        windows: false,
      });
    }
  });

  it("runs all three for a lockfile change, and for any package.json", () => {
    for (const file of [
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "package.json",
      "packages/registry/package.json",
    ]) {
      expect(jobs(pr([file])), file).toEqual({
        e2e: true,
        designSystem: true,
        windows: true,
      });
    }
  });

  it("runs both for the workflow, the actions and this gate", () => {
    for (const file of [
      ".github/workflows/ci.yml",
      ".github/actions/start-storefront/action.yml",
      ".github/scripts/stop-tree.sh",
      "scripts/lib/ci-gate.ts",
      "apps/storefront/next.config.ts",
      "apps/storefront/playwright.config.ts",
    ]) {
      expect(jobs(pr([file])), file).toEqual({
        e2e: true,
        designSystem: true,
        windows: false,
      });
    }
  });

  it("runs e2e-smoke and not design-system for the backend, the market pages and their specs", () => {
    for (const file of [
      "apps/backend/src/modules/x.ts",
      "apps/storefront/src/app/(storefront)/[market]/page.tsx",
      "apps/storefront/src/payload/collections/pages.ts",
      "apps/storefront/e2e/markets.spec.ts",
      "infra/postgres/init.sql",
      "scripts/bootstrap.ts",
    ]) {
      expect(jobs(pr([file])), file).toEqual({
        e2e: true,
        designSystem: false,
        windows: false,
      });
    }
  });

  it("fails open: globals.css, the DS flag and a file on no list run both", () => {
    for (const file of [
      "apps/storefront/src/styles/globals.css",
      "apps/storefront/src/lib/env.ts",
      "apps/storefront/src/lib/visitor/store.ts",
      "apps/storefront/src/new-folder/thing.ts",
      ".github/ISSUE_TEMPLATE/bug.yml",
      "turbo.json",
    ]) {
      expect(jobs(pr([file])), file).toEqual({ e2e: true, designSystem: true, windows: false });
    }
  });

  it("does not run design-system for a unit test outside the DS, and runs it for one inside", () => {
    expect(jobs(pr(["apps/storefront/src/lib/markets/url.test.ts"]))).toEqual({
      e2e: true,
      designSystem: false,
      windows: false,
    });
    expect(jobs(pr(["apps/storefront/src/design-system/catalog.test.ts"]))).toEqual({
      e2e: false,
      designSystem: true,
      windows: false,
    });
  });

  it("runs neither for files only tools read, and e2e-smoke for .env.example (bootstrap)", () => {
    for (const file of [
      "renovate.json",
      ".editorconfig",
      ".gitignore",
      "apps/backend/.gitignore",
      "apps/storefront/eslint.config.mjs",
      "packages/registry/eslint.config.mjs",
      "packages/config/eslint/next.mjs",
      "packages/config/prettier.config.mjs",
      "apps/storefront/components.json",
      "packages/ui/components.json",
    ]) {
      expect(jobs(pr([file])), file).toEqual({ e2e: false, designSystem: false, windows: false });
    }
    expect(jobs(pr(["apps/storefront/.env.example"]))).toEqual({
      e2e: true,
      designSystem: false,
      windows: false,
    });
  });

  it("runs every job when the API listed no file", () => {
    expect(jobs(pr([]))).toEqual({
      e2e: true,
      designSystem: true,
      windows: true,
    });
  });

  it("says why for each job", () => {
    expect(pr(["docs/SETUP.md", "apps/storefront/src/lib/env.ts"]).reasons).toEqual([
      "e2e-smoke: runs (apps/storefront/src/lib/env.ts is not docs, tooling or the design system's own)",
      "design-system: runs (apps/storefront/src/lib/env.ts)",
      "windows-smoke: skipped (no dependency file)",
    ]);
    expect(pr(["packages/registry/package.json"]).reasons).toEqual([
      "e2e-smoke: runs (packages/registry/package.json, a dependency file)",
      "design-system: runs (packages/registry/package.json)",
      "windows-smoke: runs (packages/registry/package.json)",
    ]);
    expect(pr(["docs/SETUP.md"]).reasons).toEqual([
      "e2e-smoke: skipped (every file is docs, tooling or the design system's own)",
      "design-system: skipped (every file is docs, tooling or one the DS pages cannot reach)",
      "windows-smoke: skipped (no dependency file)",
    ]);
  });
});

describe("decideJobs and the importers of the DS-only folders", () => {
  const molecule = "packages/ui/src/molecules/product-card/standard.tsx";

  it("runs e2e-smoke for a molecule once a storefront route imports the molecules", () => {
    const importer = {
      file: "apps/storefront/src/app/(storefront)/[market]/page.tsx",
      specifier: "@shopblok/ui/molecules/product-card",
    };
    expect(jobs(pr([molecule]))).toEqual({
      e2e: false,
      designSystem: true,
      windows: false,
    });
    expect(jobs(pr([molecule], [importer]))).toEqual({
      e2e: true,
      designSystem: true,
      windows: false,
    });
    expect(pr([molecule], [importer]).reasons[0]).toBe(
      "shared, because code outside the DS imports them: packages/ui/src/molecules/",
    );
  });

  it("counts a relative import from an atom into the molecules", () => {
    const importer = {
      file: "packages/ui/src/atoms/button.tsx",
      specifier: "../molecules/x",
    };
    expect(sharedAreas([importer])).toEqual(["packages/ui/src/molecules/"]);
  });

  it("counts the registry as shared once a storefront file outside the DS imports it", () => {
    const importer = {
      file: "apps/storefront/src/payload.config.ts",
      specifier: "@shopblok/registry",
    };
    expect(sharedAreas([importer])).toEqual(["packages/registry/"]);
    expect(pr(["packages/registry/src/index.ts"], [importer]).e2e).toBe(true);
  });

  it("follows an import chain through the DS: a page, an organism, its molecules, the registry", () => {
    const chain: Importer[] = [
      {
        file: "apps/storefront/src/app/(storefront)/[market]/layout.tsx",
        specifier: "@shopblok/ui/organisms/header/classic",
      },
      {
        file: "packages/ui/src/organisms/header/classic.tsx",
        specifier: "../../molecules/market-switcher/standard",
      },
      {
        file: "packages/ui/src/molecules/market-switcher/standard.tsx",
        specifier: "@shopblok/registry",
      },
    ];
    expect(sharedAreas(chain)).toEqual([
      "packages/registry/",
      "packages/ui/src/molecules/",
      "packages/ui/src/organisms/",
    ]);
    expect(jobs(pr(["packages/ui/src/molecules/market-switcher/standard.tsx"], chain))).toEqual({
      e2e: true,
      designSystem: true,
      windows: false,
    });
    // Without the page, nothing outside the DS reaches the chain.
    expect(sharedAreas(chain.slice(1))).toEqual([]);
  });

  it("does not count the design system importing its own folders", () => {
    expect(
      sharedAreas([
        {
          file: "apps/storefront/src/design-system/stories/molecules.tsx",
          specifier: "@shopblok/ui/molecules/x",
        },
        {
          file: "packages/ui/src/organisms/header/classic.tsx",
          specifier: "../../molecules/market-switcher",
        },
        {
          file: "apps/storefront/e2e/design-system.spec.ts",
          specifier: "@shopblok/registry",
        },
      ]),
    ).toEqual([]);
  });

  it("does not count an import of the atoms or of an unrelated package", () => {
    expect(
      sharedAreas([
        {
          file: "apps/storefront/src/app/global-not-found.tsx",
          specifier: "@shopblok/ui/atoms/button",
        },
        { file: "apps/storefront/src/lib/env.ts", specifier: "zod" },
        { file: "packages/ui/src/atoms/flag.tsx", specifier: "./flag-code" },
      ]),
    ).toEqual([]);
  });
});

describe("decideJobs on other events", () => {
  it.each(["schedule", "workflow_dispatch"])("%s runs every job", (event) => {
    const decision = decideJobs({ event, files: ["docs/SETUP.md"] });
    expect(jobs(decision)).toEqual({
      e2e: true,
      designSystem: true,
      windows: true,
    });
    expect(decision.reasons).toEqual([
      `${event}: e2e-smoke and design-system run (only a pull request is gated)`,
      "windows-smoke: runs (every event but a push and a pull request)",
    ]);
  });

  it("a push to main runs e2e-smoke and design-system, and not windows-smoke (T16's rule)", () => {
    const decision = decideJobs({ event: "push", files: ["pnpm-lock.yaml"] });
    expect(jobs(decision)).toEqual({
      e2e: true,
      designSystem: true,
      windows: false,
    });
    expect(decision.reasons[1]).toBe(
      "windows-smoke: skipped (a push: the pull request ran it if it changed a dependency file)",
    );
  });

  it("a dispatch with update-baselines runs none of the three (PR 63 review)", () => {
    const decision = decideJobs({ event: "workflow_dispatch", files: [], updateBaselines: true });
    expect(jobs(decision)).toEqual({ e2e: false, designSystem: false, windows: false });
    expect(decision.reasons).toEqual([
      "workflow_dispatch with update-baselines: e2e-smoke, design-system and windows-smoke are skipped (the update-baselines job runs instead)",
    ]);
  });

  it("an event the gate does not know fails open", () => {
    expect(jobs(decideJobs({ event: "merge_group", files: [] }))).toEqual({
      e2e: true,
      designSystem: true,
      windows: true,
    });
  });
});

describe("runtimeImports", () => {
  it("finds static, side-effect, re-export, dynamic and require imports", () => {
    const source = [
      'import { Button } from "@shopblok/ui/atoms/button";',
      'import Default, { a, b } from "./local";',
      'import * as all from "../all";',
      'import "./styles.css";',
      'export { c } from "@shopblok/ui/molecules/c";',
      'export * from "./everything";',
      'const lazy = await import("@shopblok/ui/organisms/lazy");',
      'const old = require("legacy");',
      "import {",
      "  multi,",
      "  line,",
      '} from "@shopblok/registry";',
    ].join("\n");
    expect(runtimeImports(source).sort()).toEqual(
      [
        "../all",
        "./everything",
        "./local",
        "./styles.css",
        "@shopblok/registry",
        "@shopblok/ui/atoms/button",
        "@shopblok/ui/molecules/c",
        "@shopblok/ui/organisms/lazy",
        "legacy",
      ].sort(),
    );
  });

  it("leaves out type-only imports and re-exports, which TypeScript erases", () => {
    const source = [
      'import type { Contract } from "@shopblok/registry";',
      'export type { Money } from "@shopblok/registry/contracts";',
      "import type {",
      "  Cart,",
      '} from "@shopblok/registry";',
    ].join("\n");
    expect(runtimeImports(source)).toEqual([]);
  });

  it("keeps an import whose names are all `type`: verbatimModuleSyntax keeps the module", () => {
    expect(runtimeImports('import { type A } from "@shopblok/registry";')).toEqual([
      "@shopblok/registry",
    ]);
  });

  it("finds a template-literal import by the text before its first ${}", () => {
    const source = [
      "const a = await import(`../molecules/${name}`);",
      "const b = await import(`@shopblok/ui/organisms/${kind}/x`);",
      "const c = await import(`./plain`);",
      "const d = await import(`${anything}`);",
    ].join("\n");
    expect(runtimeImports(source).sort()).toEqual(
      ["../molecules/", "./plain", "@shopblok/ui/organisms/"].sort(),
    );
    // The prefix of a relative template names the folder, as a relative import would.
    expect(
      sharedAreas([{ file: "packages/ui/src/atoms/lazy.tsx", specifier: "../molecules/" }]),
    ).toEqual(["packages/ui/src/molecules/"]);
  });

  it("finds a stylesheet's @import, quoted or in url()", () => {
    const source = [
      '@import "tailwindcss";',
      "@import url('../../../packages/ui/src/molecules/price-block.css');",
      '@source "../";',
    ].join("\n");
    expect(runtimeImports(source).sort()).toEqual(
      ["../../../packages/ui/src/molecules/price-block.css", "tailwindcss"].sort(),
    );
  });

  it("does not read a string after `export const` as an import", () => {
    expect(runtimeImports('export const label = "molecules";\nexport default "x";')).toEqual([]);
  });
});

describe("the path helpers", () => {
  it("isDocs: the docs folder and Markdown anywhere", () => {
    expect(isDocs("docs/SETUP.md")).toBe(true);
    expect(isDocs("docs/images/kit.png")).toBe(true);
    expect(isDocs("packages/ui/NOTICE.md")).toBe(true);
    expect(isDocs("apps/storefront/src/docs.ts")).toBe(false);
  });

  it("isDependencyFile: package.json at any depth, the lockfile and the workspace file", () => {
    expect(isDependencyFile("apps/storefront/package.json")).toBe(true);
    expect(isDependencyFile("pnpm-lock.yaml")).toBe(true);
    expect(isDependencyFile("pnpm-workspace.yaml")).toBe(true);
    expect(isDependencyFile("apps/storefront/package.json.bak")).toBe(false);
    expect(isDependencyFile("packages/ui/pnpm-lock.yaml")).toBe(false);
  });

  it("outputLines: the names ci.yml reads", () => {
    expect(outputLines({ e2e: false, designSystem: true, windows: false })).toEqual([
      "e2e=false",
      "design-system=true",
      "windows=false",
    ]);
  });
});
