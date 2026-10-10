// The HTTP requests of `pnpm run doctor` (T14): one place that turns "the server did not answer" into
// words, so every probe says the same thing and none hangs.

export type HttpResult =
  /** The server answered, with any status. */
  | { kind: "response"; status: number; text: string }
  /** Nothing is listening there (`ECONNREFUSED`): the server is not running. */
  | { kind: "refused" }
  /** No answer in time, or the connection broke: the host is there but not answering. */
  | { kind: "unreachable"; reason: string };

export type HttpOptions = {
  method?: "GET" | "POST";
  headers?: Readonly<Record<string, string>>;
  body?: unknown;
  timeoutMs?: number;
};

/** The system error code under a failed `fetch`, e.g. `ECONNREFUSED`. */
export function codeOf(error: unknown): string | undefined {
  // fetch wraps the socket error: `TypeError: fetch failed` with the system error as `cause`.
  const cause = (error as { cause?: { code?: unknown; errors?: { code?: unknown }[] } })?.cause;
  if (typeof cause?.code === "string") return cause.code;
  // `localhost` resolves to two addresses; a refusal on both arrives as an AggregateError.
  const inner = cause?.errors?.find((e) => typeof e?.code === "string");
  return typeof inner?.code === "string" ? inner.code : undefined;
}

/** Sends a request and never rejects. The response body is read as text (a JSON body parses from it). */
export async function request(url: string, options: HttpOptions = {}): Promise<HttpResult> {
  const timeoutMs = options.timeoutMs ?? 5000;
  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body === undefined ? {} : { "content-type": "application/json" }),
        ...options.headers,
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      // A redirect is an answer (the storefront may send `/` somewhere); following it would test another page.
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { kind: "response", status: response.status, text: await response.text() };
  } catch (error) {
    if (codeOf(error) === "ECONNREFUSED") return { kind: "refused" };
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return { kind: "unreachable", reason: `no answer within ${timeoutMs / 1000} s` };
    }
    const code = codeOf(error);
    return {
      kind: "unreachable",
      reason: code ?? (error instanceof Error ? error.message : String(error)),
    };
  }
}

/** The body parsed as JSON, or `undefined` when it is not. */
export function jsonOf(result: HttpResult): unknown {
  if (result.kind !== "response") return undefined;
  try {
    return JSON.parse(result.text) as unknown;
  } catch {
    return undefined;
  }
}
