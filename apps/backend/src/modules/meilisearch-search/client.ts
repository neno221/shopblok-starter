/**
 * S2 prototype (not for main, D13). A minimal Meilisearch REST client on `fetch`, enough for
 * the provider. M6 would use the official `meilisearch` package instead.
 */
export class MeiliError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type TaskStatus = "enqueued" | "processing" | "succeeded" | "failed" | "canceled";

export type MeiliTask = {
  taskUid: number;
  uid?: number;
  status: TaskStatus;
  error?: { message: string; code: string } | null;
};

export class MeiliClient {
  constructor(
    private readonly host: string,
    private readonly apiKey?: string,
  ) {}

  async request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.host.replace(/\/$/, "")}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const json = text ? JSON.parse(text) : undefined;

    if (!response.ok) {
      throw new MeiliError(
        response.status,
        json?.code ?? "unknown",
        `Meilisearch ${method} ${path}: ${json?.message ?? response.statusText}`,
      );
    }

    return json as T;
  }

  /** Waits for tasks to leave the queue, and throws if one failed. */
  async waitForTasks(ids: number[], timeoutMs = 120_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    for (const id of ids) {
      let delay = 10;

      while (true) {
        const task = await this.request<MeiliTask>("GET", `/tasks/${id}`);

        if (task.status === "succeeded") {
          break;
        }

        if (task.status === "failed" || task.status === "canceled") {
          throw new MeiliError(
            500,
            task.error?.code ?? task.status,
            `Meilisearch task ${id} ${task.status}: ${task.error?.message ?? ""}`,
          );
        }

        if (Date.now() > deadline) {
          throw new MeiliError(504, "timeout", `Meilisearch task ${id} did not finish in time`);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, 200);
      }
    }
  }
}
