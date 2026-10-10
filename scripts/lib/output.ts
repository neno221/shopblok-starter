// Reading what Medusa's and Payload's commands print (T13). Their exit codes are not enough:
// `medusa exec` exits 0 when the app cannot load its config (T07, SETUP.md item 8), and a command
// that changed nothing exits 0 like one that changed everything. Bootstrap needs both facts, so it
// reads the output. Every pattern below is taken from a real run (the tests quote them).

// eslint-disable-next-line no-control-regex -- the escape character is what an ANSI sequence starts with
const ANSI = /\u001b\[[0-9;?]*[A-Za-z]/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI, "");
}

/** The lines of a command's output without colour codes and without Medusa's `info:   ` prefix. */
function messages(output: string): { level: string | undefined; text: string }[] {
  return stripAnsi(output)
    .split(/\r?\n/)
    .map((line) => {
      const match = /^(info|warn|error|debug|http):\s+(.*)$/.exec(line);
      return { level: match?.[1], text: (match?.[2] ?? line).trim() };
    });
}

// ---------------------------------------------------------------------------------------------
// medusa db:migrate

export type MigrateOutcome = {
  /** A module migration, a link table, a search index or a migration script ran. */
  changed: boolean;
  /** `Search indexes migrated`: the next server start fills a new index version (D17, T08). */
  searchIndexMigrated: boolean;
};

/**
 * What `medusa db:migrate --execute-safe-links --execute-safe-search` did. A second run prints
 * `Skipped. Database is up-to-date for module.` per module, `Search indexes already up-to-date` and
 * lists `create-super-admin-role.js` as pending without running it (T07 item 6), so "pending" alone
 * does not count: only a line that says something ran does.
 */
export function classifyMigrate(output: string): MigrateOutcome {
  const text = stripAnsi(output);
  const searchIndexMigrated = /Search indexes migrated/.test(text);
  const changed =
    searchIndexMigrated ||
    /●\s+Migrating\s/.test(text) ||
    /following links/i.test(text) ||
    /Running migration script\s/.test(text);
  return { changed, searchIndexMigrated };
}

// ---------------------------------------------------------------------------------------------
// medusa exec (the seeds)

export type SeedOutcome = {
  /** `Finished executing script.` is there. Without it the run is not done, whatever the exit code. */
  finished: boolean;
  /** The seed created, updated or linked something. */
  changed: boolean;
  /** The demo seed said it skipped itself. */
  skipped: boolean;
  /** Warnings the seed raised on purpose (a region that differs from the seed), not Medusa's own. */
  warnings: string[];
};

// What the two seeds log when they write: `Created regions: …`, `Updated store …`, `Linked the
// stock location …`, `Filled the "product" search index …`, and `Translations: created 54, updated 0,
// unchanged 0` (only when the first two numbers are not both zero).
const SEED_WRITE = /^(Created|Updated|Linked|Filled)\b/;
const SEED_TRANSLATIONS = /^Translations: created (\d+), updated (\d+)/;

function seedWrote(text: string): boolean {
  const translations = SEED_TRANSLATIONS.exec(text);
  if (translations) return Number(translations[1]) + Number(translations[2]) > 0;
  return SEED_WRITE.test(text);
}

// Medusa warns about the development secrets on every run of a plain .env; that is not news.
const KNOWN_WARNINGS = /^http\.(jwtSecret|cookieSecret) not found/;

export function classifySeed(output: string): SeedOutcome {
  const lines = messages(output);
  return {
    finished: lines.some((line) => line.text === "Finished executing script."),
    changed: lines.some((line) => line.level === "info" && seedWrote(line.text)),
    skipped: lines.some((line) => /^Demo catalog skipped/.test(line.text)),
    warnings: lines
      .filter((line) => line.level === "warn" && !KNOWN_WARNINGS.test(line.text))
      .map((line) => line.text),
  };
}

// ---------------------------------------------------------------------------------------------
// medusa user

export type UserOutcome = "created" | "exists" | "failed";

/**
 * `medusa user` exits 1 when the user exists, with `User with email: …, already exists.` in the
 * output (T07 item 6). Bootstrap treats that as "nothing to do"; any other failure is a failure.
 */
export function classifyUser(code: number | null, output: string): UserOutcome {
  const text = stripAnsi(output);
  // Medusa's own sentence, not any "already exists": a database error such as `relation "user"
  // already exists` is a failure.
  if (/User with email:[^\r\n]*already exists/i.test(text)) return "exists";
  if (code === 0 && /User created successfully/.test(text)) return "created";
  return "failed";
}

// ---------------------------------------------------------------------------------------------
// payload

/** `payload migrate` prints `Migrating: <name>` for each migration it runs. */
export function classifyPayloadMigrate(output: string): { changed: boolean } {
  return { changed: /\bMigrating:\s/.test(stripAnsi(output)) };
}

/**
 * The result line of `bootstrap-payload.ts`: one line of JSON starting `{"bootstrapPayload":`, found
 * among Payload's log lines the way `extractPublishableKey` finds the key (T07). The last one wins.
 */
export function extractMarker<T>(output: string, name: string): T | undefined {
  const prefix = `{"${name}":`;
  let found: T | undefined;
  for (const line of stripAnsi(output).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(prefix)) continue;
    try {
      found = (JSON.parse(trimmed) as Record<string, T>)[name];
    } catch {
      // A log line that merely starts the same way; not ours.
    }
  }
  return found;
}

// ---------------------------------------------------------------------------------------------
// Showing a failure

/** The last `count` non-empty lines of an output, without colour, for an error message. */
export function tail(output: string, count = 25): string {
  const lines = stripAnsi(output)
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");
  return lines.slice(-count).join("\n");
}

/** Hides anything that looks like a secret from text about to be shown: result lines, keys and URL passwords. */
export function redact(text: string): string {
  return (
    text
      .replace(
        /("(?:publishableKey|apiKey|password|generatedAdminPassword)"\s*:\s*")[^"]+(")/g,
        "$1…$2",
      )
      .replace(/\bpk_[0-9a-f]{12,}/g, "pk_…")
      // The password of a connection string: `postgres://user:secret@host` -> `postgres://user:…@host`.
      // It runs to the last `@` of the word, so a password with an `@` or a `/` in it (not percent-
      // encoded, as people write them) is hidden whole; a `?` or `#` ends the authority.
      .replace(/(\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@]*:)[^\s?#]*@/gi, "$1…@")
  );
}
