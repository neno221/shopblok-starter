import { describe, expect, it } from "vitest";
import {
  classifyMigrate,
  classifyPayloadMigrate,
  classifySeed,
  classifyUser,
  extractMarker,
  redact,
  stripAnsi,
  tail,
} from "./output.ts";

// Lines quoted from real runs (SETUP.md T13), with the colour codes Medusa prints.
const green = (word: string) => `\u001b[32m${word}\u001b[39m`;
const info = (message: string) => `${green("info")}:    ${message}`;
const warn = (message: string) => `\u001b[33mwarn\u001b[39m:    ${message}`;

const MIGRATE_FIRST = [
  info("Running migrations..."),
  info("  ● Migrating Migration20240307161216"),
  info("Syncing links..."),
  info("Created following links tables"),
  info("Migrating search indexes..."),
  info("Search indexes migrated. They are filled when the application starts"),
  info("Pending migration scripts to execute"),
  info("Running migration script /x/migrate-tax-region-provider.js"),
  info("Migration scripts completed"),
].join("\n");

const MIGRATE_SECOND = [
  warn("http.jwtSecret not found.Using default 'supersecret'."),
  info("Running migrations..."),
  info("MODULE: product"),
  info("Skipped. Database is up-to-date for module."),
  info("Syncing links..."),
  info("Migrating search indexes..."),
  info("Search indexes already up-to-date"),
  info("Pending migration scripts to execute"),
  info("/x/migration-scripts/create-super-admin-role.js"),
  info("Running migration scripts..."),
  info("Migration scripts completed"),
].join("\n");

describe("classifyMigrate", () => {
  it("sees a first run as changed, with the search indexes migrated", () => {
    expect(classifyMigrate(MIGRATE_FIRST)).toEqual({ changed: true, searchIndexMigrated: true });
  });

  it("sees a second run as unchanged although a script is listed as pending", () => {
    expect(classifyMigrate(MIGRATE_SECOND)).toEqual({ changed: false, searchIndexMigrated: false });
  });

  it("counts each kind of change on its own", () => {
    expect(classifyMigrate(info("  ● Migrating Migration20240307161216")).changed).toBe(true);
    expect(classifyMigrate(info("Created following links tables")).changed).toBe(true);
    expect(classifyMigrate(info("Running migration script /x/a.js")).changed).toBe(true);
    expect(
      classifyMigrate(info("Search indexes migrated. They are filled when the application starts")),
    ).toEqual({
      changed: true,
      searchIndexMigrated: true,
    });
    expect(classifyMigrate("")).toEqual({ changed: false, searchIndexMigrated: false });
  });
});

describe("classifySeed", () => {
  const FIRST = [
    warn("http.jwtSecret not found.Using default 'supersecret'."),
    info('Sales channel "Default Sales Channel" exists (sc_1)'),
    info("Updated store store_1: name, currencies, locales"),
    info("Created regions: Europe, United States"),
    info("Markets are seeded."),
    info("Finished executing script."),
  ].join("\n");
  const SECOND = [
    warn("http.jwtSecret not found.Using default 'supersecret'."),
    info("Store store_1 is up to date"),
    info("All 4 regions exist"),
    info('Stock location "Shopblok warehouse" exists (sloc_1)'),
    info("Markets are seeded."),
    info("Finished executing script."),
  ].join("\n");

  it("sees a first run as changed and finished", () => {
    expect(classifySeed(FIRST)).toMatchObject({ finished: true, changed: true, skipped: false });
  });

  it("sees a second run as finished and unchanged", () => {
    expect(classifySeed(SECOND)).toMatchObject({ finished: true, changed: false });
  });

  it("is not finished without the final line, whatever else it printed (medusa exec exits 0 on a config error)", () => {
    const loadFailure = `${warn("something")}\nError: [config] ⚠️ http.jwtSecret not found.`;
    expect(classifySeed(loadFailure).finished).toBe(false);
    expect(classifySeed(FIRST.replace("Finished executing script.", "")).finished).toBe(false);
  });

  it("wants the final line as Medusa prints it, not a line that only starts like it", () => {
    expect(classifySeed(info("Finished executing script early")).finished).toBe(false);
    expect(classifySeed(info("Finished executing script.")).finished).toBe(true);
  });

  it("counts each way a seed writes", () => {
    expect(classifySeed(info('Linked the stock location to "Default Sales Channel"')).changed).toBe(
      true,
    );
    expect(
      classifySeed(info('Filled the "product" search index from the database (it was pending).'))
        .changed,
    ).toBe(true);
    expect(classifySeed(info("Translations: created 54, updated 0, unchanged 0")).changed).toBe(
      true,
    );
    expect(classifySeed(info("Translations: created 0, updated 2, unchanged 52")).changed).toBe(
      true,
    );
    expect(classifySeed(info("Translations: created 0, updated 0, unchanged 54")).changed).toBe(
      false,
    );
    expect(classifySeed(info("All 54 translations exist")).changed).toBe(false);
    expect(classifySeed(info("Indexed 8 demo products for search (ingest).")).changed).toBe(false);
  });

  it("only counts a line the seed logged at info level", () => {
    expect(classifySeed(warn("Created by someone else")).changed).toBe(false);
    expect(classifySeed("Created regions: x").changed).toBe(false);
  });

  it("knows the demo seed skipped itself", () => {
    const out = [
      info("Demo catalog skipped (SEED_DEMO=false or the skip argument)."),
      info("Finished executing script."),
    ].join("\n");
    expect(classifySeed(out)).toMatchObject({ finished: true, changed: false, skipped: true });
  });

  it("returns the seed's own warnings and not Medusa's secret warnings", () => {
    const out = [
      warn("http.jwtSecret not found.Using default 'supersecret'."),
      warn("http.cookieSecret not found. Using default 'supersecret'."),
      warn('Region "Europe" differs from the seed (found as "EU"). Left as it is.'),
    ].join("\n");
    expect(classifySeed(out).warnings).toEqual([
      'Region "Europe" differs from the seed (found as "EU"). Left as it is.',
    ]);
  });
});

describe("classifyUser", () => {
  it("separates a created user, an existing one and a failure", () => {
    expect(classifyUser(0, info("User created successfully."))).toBe("created");
    expect(
      classifyUser(
        1,
        "  message: 'User with email: admin@example.com, already exists.',\n  type: 'invalid_data'",
      ),
    ).toBe("exists");
    expect(classifyUser(1, "ECONNREFUSED 127.0.0.1:15432")).toBe("failed");
    // Some other "already exists" is not the user's.
    expect(classifyUser(1, 'error: relation "user" already exists')).toBe("failed");
    expect(classifyUser(1, 'database "medusa" already exists')).toBe("failed");
    expect(classifyUser(0, "nothing useful")).toBe("failed");
    expect(classifyUser(null, "")).toBe("failed");
  });
});

describe("classifyPayloadMigrate", () => {
  it("sees a run that migrated and one that did not", () => {
    const first =
      "[00:09:21] INFO: Migrating: 20261009_115513_initial\n[00:09:21] INFO: Migrated:  20261009_115513_initial (158ms)\n[00:09:21] INFO: Done.";
    const second =
      "[00:09:25] INFO: Reading migration files from /x/src/migrations\n[00:09:25] INFO: Done.";
    expect(classifyPayloadMigrate(first).changed).toBe(true);
    expect(classifyPayloadMigrate(second).changed).toBe(false);
  });
});

describe("extractMarker", () => {
  it("finds the result line among log lines, and the last one wins", () => {
    const out = [
      "[00:09:21] INFO: start",
      '{"bootstrapPayload":{"admin":"created"}}',
      '[00:09:22] INFO: log line that mentions {"bootstrapPayload": no',
      '{"bootstrapPayload":{"admin":"exists"}}',
    ].join("\n");
    expect(extractMarker<{ admin: string }>(out, "bootstrapPayload")).toEqual({ admin: "exists" });
  });

  it("ignores a broken line and returns nothing when there is none", () => {
    expect(extractMarker('{"bootstrapPayload":{', "bootstrapPayload")).toBeUndefined();
    expect(extractMarker("", "bootstrapPayload")).toBeUndefined();
  });
});

describe("showing output", () => {
  it("strips colour codes", () => {
    expect(stripAnsi(info("hello"))).toBe("info:    hello");
  });

  it("tail keeps the last non-empty lines", () => {
    expect(tail("a\n\nb\nc\n\n", 2)).toBe("b\nc");
  });

  it("redact hides keys and passwords", () => {
    expect(redact('{"publishableKey":"pk_0123456789abcdef0123"}')).toBe('{"publishableKey":"…"}');
    expect(redact('{"password":"hunter2"}')).toBe('{"password":"…"}');
    expect(redact('{"bootstrapPayload":{"generatedAdminPassword":"0123456789abcdef0123"}}')).toBe(
      '{"bootstrapPayload":{"generatedAdminPassword":"…"}}',
    );
    expect(redact("key is pk_0123456789abcdef0123456789")).toBe("key is pk_…");
    expect(redact("nothing secret here")).toBe("nothing secret here");
  });
});

describe("redact: connection strings", () => {
  it("hides the password of a URL, with or without a user name", () => {
    expect(redact("postgres://postgres:hunter2@localhost:15432/medusa")).toBe(
      "postgres://postgres:…@localhost:15432/medusa",
    );
    expect(redact("redis://:hunter2@localhost:6380")).toBe("redis://:…@localhost:6380");
  });

  it("leaves a URL without a password alone", () => {
    expect(redact("http://localhost:9000/health redis://localhost:6380")).toBe(
      "http://localhost:9000/health redis://localhost:6380",
    );
  });
});
