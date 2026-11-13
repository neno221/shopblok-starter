// What `pnpm check:keys` looks for (M6 D115, T93): a key of Stripe, Resend, R2 or AWS, or (T97) a
// PostHog personal key, written into a file. Pure: the files' text comes in, the findings go out,
// and `scripts/check-no-keys.ts` does the reading. A finding never holds the key itself, only where it is and what kind it is, so the check's
// output (CI's log) does not repeat the leak.
//
// Each pattern is anchored at the start of a word, so an ordinary identifier that happens to end in a
// prefix (`task_`, `desk_test_`, `are_`, `store_`) never matches, and it asks for the length of a
// real key, so a short placeholder in the docs or a test (`sk_test_…`, `sk_live_fake`) does not
// either. Stripe's publishable test key (`pk_test_`) is not a secret and is not looked for; its
// live one is, because a live key outside production is itself a mistake (doctor refuses it too).

export type KeyKind = {
  id: string;
  /** What the key is, for the finding's line. */
  name: string;
  pattern: RegExp;
};

// `(?<![A-Za-z0-9_])`: the key starts a word. `g` because a line may hold more than one.
const word = "(?<![A-Za-z0-9_])";

export const KEY_KINDS: readonly KeyKind[] = [
  {
    id: "stripe-secret",
    name: "Stripe secret key",
    pattern: new RegExp(`${word}sk_(?:test|live)_[A-Za-z0-9]{16,}`, "g"),
  },
  {
    id: "stripe-restricted",
    name: "Stripe restricted key",
    pattern: new RegExp(`${word}rk_(?:test|live)_[A-Za-z0-9]{16,}`, "g"),
  },
  {
    id: "stripe-publishable-live",
    name: "Stripe live publishable key",
    pattern: new RegExp(`${word}pk_live_[A-Za-z0-9]{16,}`, "g"),
  },
  {
    id: "stripe-webhook",
    name: "Stripe webhook signing secret",
    pattern: new RegExp(`${word}whsec_[A-Za-z0-9]{16,}`, "g"),
  },
  {
    id: "resend",
    name: "Resend API key",
    pattern: new RegExp(`${word}re_[A-Za-z0-9_]{20,}`, "g"),
  },
  {
    // R2's key pair is plain hex (32 and 64 characters), which no prefix tells apart from a hash, so
    // it is looked for only as the value of its own name (`S3_SECRET_ACCESS_KEY=…`, `: "…"`). The
    // lookbehind keeps the name out of the match, so a masked log still says which key it was
    // (PR 134 review, item 6). An empty `S3_SECRET_ACCESS_KEY=` in `.env.example` does not match.
    id: "s3-key",
    name: "S3/R2 access key",
    pattern: new RegExp(
      `(?<=${word}S3_(?:ACCESS_KEY_ID|SECRET_ACCESS_KEY)[ \\t]*[=:][ \\t]*["']?)[A-Za-z0-9/+]{20,}`,
      "g",
    ),
  },
  {
    // T97: a PostHog personal API key reads and changes the whole account; the project key (`phc_`)
    // is public (it is in the browser's bundle) and is not looked for.
    id: "posthog-personal",
    name: "PostHog personal API key",
    pattern: new RegExp(`${word}phx_[A-Za-z0-9]{20,}`, "g"),
  },
  {
    id: "aws-access-key",
    name: "AWS-style access key id",
    pattern: new RegExp(`${word}AKIA[0-9A-Z]{16}(?![0-9A-Z])`, "g"),
  },
];

/**
 * Key-shaped strings that are known fakes: a test fixture's, written out in full so that it is plainly
 * not a key (a word like FAKE in it). Add one here, with the file that uses it, rather than loosening a
 * pattern. Empty while no fixture needs one.
 */
export const ALLOWED_FAKE_KEYS: ReadonlySet<string> = new Set<string>([
  // scripts/lib/no-keys.test.ts: the check's own mutation, which proves a real-length key fails.
  "sk_test_FAKEFAKEFAKEFAKE0000",
]);

export type Finding = {
  file: string;
  line: number;
  kind: KeyKind["id"];
  name: string;
};

/** Every key-shaped string in one file's text, but the allowed fakes. */
export function findKeys(file: string, text: string): Finding[] {
  const findings: Finding[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((content, index) => {
    for (const kind of KEY_KINDS) {
      for (const match of content.matchAll(kind.pattern)) {
        if (ALLOWED_FAKE_KEYS.has(match[0])) continue;
        findings.push({ file, line: index + 1, kind: kind.id, name: kind.name });
      }
    }
  });
  return findings;
}

/** A file whose text is not worth reading: a NUL byte in its first 8 KB makes it binary (as git says). */
export function isBinary(head: Uint8Array): boolean {
  return head.subarray(0, 8192).includes(0);
}

/** The lines `check-no-keys` prints for its findings: where, and what kind, never the value. */
export function describeFindings(findings: readonly Finding[]): string[] {
  return findings.map((f) => `${f.file}:${f.line}: a ${f.name} (${f.kind})`);
}

/** What a masked key reads as in a log. */
export const MASK = "***";

/**
 * `text` with every key-shaped string (the patterns above, allowed fakes included) and every one of
 * `values` replaced by `***` (M6 D114: the logs `integrations-live` uploads). `values` are the keys
 * themselves, from the job's environment: a key whose shape no pattern knows (a Sentry DSN, a
 * PostHog key) is masked by its value. Values shorter than 8 characters are left alone, since such a
 * value is no key and would mask ordinary words.
 */
export function maskKeys(text: string, values: readonly string[] = []): string {
  let masked = text;
  for (const value of [...values].sort((a, b) => b.length - a.length)) {
    if (value.trim().length < 8) continue;
    masked = masked.split(value).join(MASK);
  }
  for (const kind of KEY_KINDS) masked = masked.replace(kind.pattern, MASK);
  return masked;
}
