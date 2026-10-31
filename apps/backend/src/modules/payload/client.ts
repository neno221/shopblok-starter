import { z } from "@medusajs/framework/zod";

/**
 * A small client for Payload's REST API, in the shape of `@payloadcms/sdk` 3.92.1 (`find`,
 * `create`, `update`, `delete`; the market map left Payload with M4b, so no globals). The SDK itself is not used (T60,
 * step 3): its runtime imports of `payload` are type-only, but it is ESM-only (the backend's Jest
 * runs CommonJS through swc), it lists all of `payload` as a dependency, and it is marked
 * experimental. Every answer is parsed with zod, so a Payload that answers something else fails
 * here, by name, and not three steps later.
 *
 * It signs in as an `integrations` user with its API key (`Authorization: integrations API-Key
 * <key>`), never with the guide's `?is_from_medusa` flag, which any caller could add.
 */

export type PayloadClientOptions = {
  /** Payload's origin, the storefront's (`http://localhost:8000`); `/api` is added here. */
  serverUrl: string;
  apiKey: string;
  /** The auth collection the key belongs to. */
  userCollection?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
};

export class PayloadRequestError extends Error {
  constructor(
    message: string,
    readonly status: number | undefined,
  ) {
    super(message);
    this.name = "PayloadRequestError";
  }
}

export type Where = Record<string, unknown>;

export type FindOptions = {
  where?: Where;
  limit?: number;
  page?: number;
  select?: Record<string, true>;
  sort?: string;
  /** Payload's `locale` for localized fields, and the one it falls back to. */
  locale?: string;
  fallbackLocale?: string;
  /** This request's own time-out, instead of the client's. */
  timeoutMs?: number;
};

const doc = z.looseObject({ id: z.union([z.number(), z.string()]) });
export type PayloadDoc = z.infer<typeof doc>;

const findResult = z.object({
  docs: z.array(doc),
  hasNextPage: z.boolean(),
  totalDocs: z.number(),
});
const docResult = z.object({ doc });
const errorBody = z.object({ errors: z.array(z.object({ message: z.string() })).min(1) });

/** `{ where: { medusaId: { equals: "x" } } }` as Payload's query string: `where[medusaId][equals]=x`. */
export function toQuery(value: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, item]) => {
    const name = prefix === "" ? key : `${prefix}[${key}]`;
    if (item === undefined) return [];
    if (item !== null && typeof item === "object") {
      return toQuery(item as Record<string, unknown>, name);
    }
    return [`${encodeURIComponent(name)}=${encodeURIComponent(String(item))}`];
  });
}

export type PayloadClient = ReturnType<typeof createPayloadClient>;

export function createPayloadClient(options: PayloadClientOptions) {
  const {
    serverUrl,
    apiKey,
    userCollection = "integrations",
    fetch: send = fetch,
    timeoutMs = 10_000,
  } = options;
  const base = `${serverUrl.replace(/\/+$/, "")}/api`;

  async function request<T>(
    schema: z.ZodType<T>,
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    query: Record<string, unknown> = {},
    body?: unknown,
    waitMs = timeoutMs,
  ): Promise<T> {
    const search = toQuery({ depth: 0, ...query }).join("&");
    const url = `${base}${path}${search === "" ? "" : `?${search}`}`;
    let response: Response;
    try {
      response = await send(url, {
        method,
        headers: {
          Authorization: `${userCollection} API-Key ${apiKey}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(waitMs),
      });
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error);
      throw new PayloadRequestError(
        `${method} ${path}: Payload did not answer (${cause})`,
        undefined,
      );
    }
    const text = await response.text();
    let json: unknown;
    try {
      json = text === "" ? undefined : JSON.parse(text);
    } catch {
      json = undefined;
    }
    if (!response.ok) {
      const parsed = errorBody.safeParse(json);
      const reason = parsed.success
        ? parsed.data.errors.map((error) => error.message).join("; ")
        : text.slice(0, 200);
      throw new PayloadRequestError(
        `${method} ${path}: Payload answered ${response.status}: ${reason}`,
        response.status,
      );
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new PayloadRequestError(
        `${method} ${path}: Payload's answer is not what the sync expects: ${parsed.error.message}`,
        response.status,
      );
    }
    return parsed.data;
  }

  return {
    find: (
      collection: string,
      {
        where,
        limit,
        page,
        select,
        sort,
        locale,
        fallbackLocale,
        timeoutMs: waitMs,
      }: FindOptions = {},
    ) =>
      request(
        findResult,
        "GET",
        `/${collection}`,
        { where, limit, page, select, sort, locale, "fallback-locale": fallbackLocale },
        undefined,
        waitMs,
      ),
    create: async (collection: string, data: Record<string, unknown>) =>
      (await request(docResult, "POST", `/${collection}`, {}, data)).doc,
    update: async (collection: string, id: number | string, data: Record<string, unknown>) =>
      (await request(docResult, "PATCH", `/${collection}/${id}`, {}, data)).doc,
    delete: async (collection: string, id: number | string) =>
      (await request(docResult, "DELETE", `/${collection}/${id}`)).doc,
  };
}
