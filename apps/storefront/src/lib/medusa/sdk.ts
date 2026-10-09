import Medusa from "@medusajs/js-sdk";
import "server-only";
import { medusaEnv, type MedusaEnv } from "../env";
import { withTimeout } from "../with-timeout";

/** Give up on a call Medusa has not answered after this long. */
export const MEDUSA_REQUEST_TIMEOUT_MS = 10_000;

/** The Medusa Store API could not give an answer: it is down, unreachable, or it refused the call. */
export class MedusaRequestError extends Error {
  override name = "MedusaRequestError";
  /**
   * `unreachable`: no answer (the backend is stopped, a wrong URL, no reply in time). `rejected`: an
   * answer that is an HTTP error, or is not Medusa's (another app on the address).
   */
  readonly kind: "unreachable" | "rejected";
  readonly status: number | undefined;

  constructor(message: string, kind: "unreachable" | "rejected", status?: number, cause?: unknown) {
    super(message, { cause });
    this.kind = kind;
    this.status = status;
  }
}

/** The SDK's `FetchError` has `status` and `statusText`; a network failure is a bare `TypeError`. */
function toRequestError(error: unknown, backendUrl: string): MedusaRequestError {
  const status = (error as { status?: unknown } | null)?.status;
  const detail = error instanceof Error ? error.message : String(error);
  // Node's `fetch failed` hides the reason (ECONNREFUSED, ENOTFOUND, …) in `cause`.
  const reason = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
  if (typeof status === "number") {
    const hint =
      status === 400 && /publishable/i.test(detail)
        ? " (check NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY; `pnpm bootstrap` fills it)"
        : "";
    return new MedusaRequestError(
      `Medusa at ${backendUrl} answered ${status}: ${detail}${hint}`,
      "rejected",
      status,
      error,
    );
  }
  // The SDK parses the body with `resp.json()` and lets its `SyntaxError` through as it is.
  if (error instanceof SyntaxError) {
    return new MedusaRequestError(
      `Medusa at ${backendUrl} answered, but not with JSON (${detail}); is MEDUSA_BACKEND_URL the backend and not another app?`,
      "rejected",
      undefined,
      error,
    );
  }
  return new MedusaRequestError(
    `Medusa at ${backendUrl} did not answer (${typeof reason === "string" ? `${reason}: ` : ""}${detail}); is the backend running (pnpm dev) and MEDUSA_BACKEND_URL right?`,
    "unreachable",
    undefined,
    error,
  );
}

export function createSdk({ backendUrl, publishableKey }: MedusaEnv): Medusa {
  return new Medusa({ baseUrl: backendUrl, publishableKey });
}

type SdkState = { client: Medusa; backendUrl: string };

let sdk: Promise<SdkState> | undefined;

/**
 * The SDK, created on first use and shared by every request. Nothing is read from the environment
 * until then, so `next build` works with no `.env`. The shared instance must hold no per-request
 * state: `setLocale` is for the browser (on a server it only logs a warning) and a JWT would
 * belong to one shopper, so the locale goes in each call's headers (`localeHeaders`). A settings
 * problem is not kept: the next call checks again.
 */
function getSdk(): Promise<SdkState> {
  sdk ??= medusaEnv()
    .then((settings) => ({ client: createSdk(settings), backendUrl: settings.backendUrl }))
    .catch((error: unknown) => {
      sdk = undefined;
      throw error;
    });
  return sdk;
}

/**
 * The language Medusa answers in (D8): the market's `medusaLocale`, as `x-medusa-locale`. The SDK
 * puts it after its own headers, so it wins over a stored locale.
 */
export function localeHeaders(locale: string): { "x-medusa-locale": string } {
  return { "x-medusa-locale": locale };
}

/**
 * Runs one call against the Store API and turns a failure into a `MedusaRequestError`. The SDK's
 * methods take no abort signal, so a call that is not answered in `MEDUSA_REQUEST_TIMEOUT_MS` is
 * given up on (the request itself runs on until the socket closes).
 */
export async function medusaRequest<T>(call: (client: Medusa) => Promise<T>): Promise<T> {
  const { client, backendUrl } = await getSdk();
  try {
    return await withTimeout(call(client), MEDUSA_REQUEST_TIMEOUT_MS);
  } catch (error) {
    throw toRequestError(error, backendUrl);
  }
}
