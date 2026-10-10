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

/**
 * The system error code under a failed `fetch`, e.g. `ECONNREFUSED`. `localhost` resolves to two
 * addresses and Node tries both; when both fail, the cause is an AggregateError whose own `code` is
 * the first address's. That one can be an IPv6 error (`EAFNOSUPPORT` in a container without IPv6)
 * that hides the refusal on `127.0.0.1`, so a refusal on any address wins.
 */
export function codeOf(error: unknown): string | undefined {
  // fetch wraps the socket error: `TypeError: fetch failed` with the system error as `cause`.
  const cause = (error as { cause?: { code?: unknown; errors?: unknown } } | null)?.cause;
  const inner = Array.isArray(cause?.errors) ? (cause.errors as { code?: unknown }[]) : [];
  const codes = [cause?.code, ...inner.map((e) => e?.code)].filter(
    (code): code is string => typeof code === "string",
  );
  return codes.includes("ECONNREFUSED") ? "ECONNREFUSED" : codes[0];
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

/** How a server that gave no answer is described: "is not running" or "does not answer (reason)". */
export function describeUnreachable(result: Exclude<HttpResult, { kind: "response" }>): string {
  return result.kind === "refused" ? "is not running" : `does not answer (${result.reason})`;
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
