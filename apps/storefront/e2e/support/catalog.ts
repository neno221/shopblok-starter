import { readFileSync } from "node:fs";
import path from "node:path";

// What the catalog specs read from Medusa directly (T49): the published handles in handle order, as
// `prerender.ts` asks for them, so the outage spec never hard-codes which products a build left
// out. The URL and the key come from the environment or, as `pnpm bootstrap` writes them, from
// `apps/storefront/.env` (Playwright does not load it).

const envFile = path.resolve(import.meta.dirname, "../../.env");

function fromEnvFile(name: string): string | undefined {
  try {
    const line = readFileSync(envFile, "utf8")
      .split("\n")
      .find((each) => each.startsWith(`${name}=`));
    return line?.slice(name.length + 1).trim() || undefined;
  } catch {
    return undefined;
  }
}

const setting = (name: string) => process.env[name]?.trim() || fromEnvFile(name);

/** `STOREFRONT_PRERENDER_PRODUCTS` as the build had it: CI builds with 4 (D67, item 2). */
export function prerenderCap(): number {
  return Number(process.env["STOREFRONT_PRERENDER_PRODUCTS"] ?? "4");
}

/** Every published handle, in the order `generateStaticParams` takes them (Medusa's `order=handle`). */
export async function catalogHandles(): Promise<string[]> {
  const backend = setting("MEDUSA_BACKEND_URL") ?? "http://localhost:9000";
  const key = setting("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");
  if (key === undefined)
    throw new Error("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not set (run pnpm bootstrap)");
  const response = await fetch(`${backend}/store/products?fields=handle&order=handle&limit=100`, {
    headers: { "x-publishable-api-key": key },
  });
  if (!response.ok) throw new Error(`Medusa answered ${response.status} for the handles`);
  const body = (await response.json()) as { products: { handle: string }[] };
  return body.products.map((product) => product.handle);
}

/** Where the outage spec leaves its subjects for the recovery spec (a folder its run keeps). */
export const OUTAGE_SUBJECTS = path.resolve(
  import.meta.dirname,
  "../../test-results-outage/outage-subjects.json",
);
