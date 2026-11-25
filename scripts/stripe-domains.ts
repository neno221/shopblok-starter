// `pnpm stripe:domains [--dry-run]` (M6 T100, D117): registers the shop's domains with Stripe as
// payment method domains, which Apple Pay needs (Google Pay and Link show only on them too): the
// storefront's own (`NEXT_PUBLIC_BASE_URL`) and each open country's own domain (`/store/markets`).
// Idempotent: a domain Stripe has is left alone, a disabled one is enabled. Stripe cannot register
// `localhost` or an IP address, so in development there is nothing to do; Apple Pay is tried on
// M7's staging. Reads `STRIPE_API_KEY` from the shell or `apps/backend/.env`, and the storefront's
// URL and publishable key from the shell or `apps/storefront/.env`; prints no key.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { envValue } from "./lib/env-file.ts";
import { jsonOf, request } from "./lib/http.ts";
import { redact } from "./lib/output.ts";
import {
  domainPlan,
  readStripeDomains,
  siteDomains,
  STRIPE_API,
  stripeMode,
} from "./lib/stripe-checks.ts";

const root = path.resolve(import.meta.dirname, "..");
const readText = (file: string) => (existsSync(file) ? readFileSync(file, "utf8") : "");
const backendText = readText(path.join(root, "apps", "backend", ".env"));
const storefrontText = readText(path.join(root, "apps", "storefront", ".env"));
const backend = (key: string) => envValue(process.env, backendText, key)?.trim() ?? "";
const storefront = (key: string) => envValue(process.env, storefrontText, key)?.trim() ?? "";

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--dry-run")) {
    console.error("pnpm stripe:domains [--dry-run]");
    return 2;
  }
  const dryRun = args.includes("--dry-run");
  const secret = backend("STRIPE_API_KEY");
  if (secret === "") {
    console.error(
      "STRIPE_API_KEY is not set (apps/backend/.env or the shell): nothing to register with.",
    );
    return 1;
  }
  const base = (process.env.STRIPE_BASE_URL?.trim() || STRIPE_API).replace(/\/+$/, "");
  const medusa = (
    storefront("MEDUSA_BACKEND_URL") ||
    backend("MEDUSA_BACKEND_URL") ||
    "http://localhost:9000"
  ).replace(/\/+$/, "");
  const key = storefront("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");
  const markets =
    key === ""
      ? undefined
      : (
          jsonOf(
            await request(`${medusa}/store/markets`, {
              headers: { "x-publishable-api-key": key },
              timeoutMs: 15_000,
            }),
          ) as { markets?: Parameters<typeof siteDomains>[1] } | undefined
        )?.markets;
  if (markets === undefined)
    console.warn(
      "The markets' own domains were not read (no backend or publishable key): only NEXT_PUBLIC_BASE_URL's.",
    );
  const wanted = siteDomains(storefront("NEXT_PUBLIC_BASE_URL"), markets);
  if (wanted.length === 0) {
    console.log(
      "No domain Stripe can register (localhost and IP addresses cannot be): nothing to do.",
    );
    return 0;
  }
  const auth = { Authorization: `Bearer ${secret}` };
  const registered = readStripeDomains(
    await request(`${base}/v1/payment_method_domains?limit=100`, {
      headers: auth,
      timeoutMs: 15_000,
    }),
  );
  if (typeof registered === "string") {
    console.error(`Stripe's domains could not be read: ${registered}.`);
    return 1;
  }
  const plan = domainPlan(wanted, registered);
  console.log(
    `Stripe (${stripeMode(secret) ?? "unknown"} mode): ${plan.ready.length} ready, ${plan.add.length} to register, ${plan.enable.length} to enable.`,
  );
  for (const domain of plan.ready) console.log(`  ready     ${domain}`);
  let failed = 0;
  const form = (fields: Record<string, string>) => ({
    method: "POST" as const,
    headers: { ...auth, "content-type": "application/x-www-form-urlencoded" },
    text: new URLSearchParams(fields).toString(),
    timeoutMs: 15_000,
  });
  for (const domain of plan.add) {
    if (dryRun) {
      console.log(`  register  ${domain} (dry run)`);
      continue;
    }
    const answer = await request(
      `${base}/v1/payment_method_domains`,
      form({ domain_name: domain }),
    );
    const ok = answer.kind === "response" && answer.status === 200;
    if (!ok) failed++;
    console.log(
      `  ${ok ? "registered" : "FAILED   "} ${domain}${ok ? "" : ` (${answer.kind === "response" ? `HTTP ${answer.status}` : answer.kind})`}`,
    );
  }
  for (const entry of plan.enable) {
    if (dryRun) {
      console.log(`  enable    ${entry.domain} (dry run)`);
      continue;
    }
    const answer = await request(
      `${base}/v1/payment_method_domains/${encodeURIComponent(entry.id)}`,
      form({ enabled: "true" }),
    );
    const ok = answer.kind === "response" && answer.status === 200;
    if (!ok) failed++;
    console.log(`  ${ok ? "enabled   " : "FAILED    "} ${entry.domain}`);
  }
  return failed === 0 ? 0 : 1;
}

try {
  process.exitCode = await main();
} catch (error) {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(`stripe-domains failed unexpectedly:\n${redact(message)}`);
  process.exitCode = 1;
}
