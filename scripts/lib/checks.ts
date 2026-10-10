// The preflight of `pnpm bootstrap` (T13, step 1): are the tools the right version, is each service
// reachable on the port the apps are configured for, and is the service on that port this project's?
//
// The last question is D15's. A developer who runs other projects has a Postgres on 5432 that
// accepts `postgres:postgres`, and Payload creates a missing database on connect, so a migration
// aimed at the wrong server writes into another project. `docker compose port <service>` says which
// host port this project's container really publishes; if it isn't the configured one, something
// else answers there. The decisions are pure functions over what was observed, so tests need no
// Docker; `observe*` functions do the looking.
import net from "node:net";
import { run } from "./exec.ts";

// ---------------------------------------------------------------------------------------------
// Versions

type Version = [number, number, number];

function parseVersion(text: string): Version | undefined {
  const match = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(text.trim());
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

function compare(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/**
 * Whether `version` meets `range`, for the one shape `package.json`'s `engines` uses here: space
 * separated comparators such as `>=22.22.0 <25`. A comparator without an operator means "equal".
 * An unreadable range or version is not satisfied.
 */
export function satisfies(version: string, range: string): boolean {
  const actual = parseVersion(version);
  if (!actual) return false;
  const comparators = range.trim().split(/\s+/).filter(Boolean);
  if (comparators.length === 0) return false;

  return comparators.every((comparator) => {
    const match = /^(>=|<=|>|<|=)?(.+)$/.exec(comparator);
    const wanted = parseVersion(match?.[2] ?? "");
    if (!match || !wanted) return false;
    const order = compare(actual, wanted);
    switch (match[1] ?? "=") {
      case ">=":
        return order >= 0;
      case ">":
        return order > 0;
      case "<=":
        return order <= 0;
      case "<":
        return order < 0;
      default:
        return order === 0;
    }
  });
}

// ---------------------------------------------------------------------------------------------
// Which services, on which ports

export type ServiceKind = "postgres" | "redis" | "meilisearch" | "mailpit-smtp" | "mailpit-ui";

/** One thing bootstrap needs reachable, as the apps are configured to reach it. */
export type Target = {
  /** Shown to the person: `Postgres (medusa)`. */
  label: string;
  kind: ServiceKind;
  /** The compose service and the port inside its container, for `docker compose port`. */
  service: string;
  containerPort: number;
  host: string;
  port: number;
  /** Why the check is needed or what to do when it fails, in a few words. */
  hint?: string;
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]);

/** True for a host on this machine: only those can be one of this project's compose containers. */
export function isLocalHost(host: string): boolean {
  return LOCAL_HOSTS.has(host.toLowerCase());
}

/** `host:port` as a person (or a URL) would write it: a bare IPv6 address goes in brackets. */
export function addressOf(target: Pick<Target, "host" | "port">): string {
  const host = target.host.includes(":") ? `[${target.host}]` : target.host;
  return `${host}:${target.port}`;
}

function urlTarget(
  value: string | undefined,
  fallbackPort: number,
  base: Omit<Target, "host" | "port">,
): Target | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  try {
    const url = new URL(value.trim());
    return {
      ...base,
      // `new URL("redis://[::1]:6380").hostname` is `[::1]`; a socket needs the bare address.
      host: url.hostname.replace(/^\[(.*)\]$/, "$1"),
      port: url.port === "" ? fallbackPort : Number(url.port),
    };
  } catch {
    return undefined;
  }
}

export type ConfiguredEnv = {
  DATABASE_URL?: string | undefined;
  PAYLOAD_DATABASE_URL?: string | undefined;
  REDIS_URL?: string | undefined;
  MEILISEARCH_HOST?: string | undefined;
  MAILPIT_SMTP_PORT?: string | undefined;
  MAILPIT_UI_PORT?: string | undefined;
};

export const COMPOSE_DEFAULTS = {
  postgresPort: 15432,
  redisPort: 6380,
  meilisearchPort: 7701,
  mailpitSmtpPort: 1025,
  mailpitUiPort: 8025,
} as const;

/**
 * The services bootstrap checks, with the host and port each app would use. A missing value falls
 * back to the compose defaults (D15), because the stack is what bootstrap expects to find. A blank
 * `REDIS_URL` means the backend runs on its in-memory modules (T06), so there is no Redis to check.
 */
export function targetsFrom(env: ConfiguredEnv): Target[] {
  const postgres = {
    kind: "postgres",
    service: "postgres",
    containerPort: 5432,
  } as const;
  const list: Target[] = [];

  const medusaDb = urlTarget(env.DATABASE_URL, 5432, {
    ...postgres,
    label: "Postgres (medusa database)",
  }) ?? {
    ...postgres,
    label: "Postgres (medusa database)",
    host: "localhost",
    port: COMPOSE_DEFAULTS.postgresPort,
  };
  const payloadDb = urlTarget(env.PAYLOAD_DATABASE_URL, 5432, {
    ...postgres,
    label: "Postgres (payload database)",
  }) ?? {
    ...postgres,
    label: "Postgres (payload database)",
    host: "localhost",
    port: COMPOSE_DEFAULTS.postgresPort,
  };
  // One server holds both databases in the compose stack: check it once, not twice.
  if (medusaDb.host === payloadDb.host && medusaDb.port === payloadDb.port) {
    list.push({ ...medusaDb, label: "Postgres (medusa and payload databases)" });
  } else {
    list.push(medusaDb, payloadDb);
  }

  const redis = urlTarget(env.REDIS_URL, 6379, {
    kind: "redis",
    label: "Redis",
    service: "redis",
    containerPort: 6379,
    hint: "REDIS_URL is set, and the backend never starts when Redis is down (T06); blank REDIS_URL in apps/backend/.env to use the in-memory modules",
  });
  if (redis) list.push(redis);

  list.push(
    urlTarget(env.MEILISEARCH_HOST, 7700, {
      kind: "meilisearch",
      label: "Meilisearch",
      service: "meilisearch",
      containerPort: 7700,
    }) ?? {
      kind: "meilisearch",
      label: "Meilisearch",
      service: "meilisearch",
      containerPort: 7700,
      host: "localhost",
      port: COMPOSE_DEFAULTS.meilisearchPort,
    },
  );

  list.push(
    {
      kind: "mailpit-smtp",
      label: "Mailpit (SMTP)",
      service: "mailpit",
      containerPort: 1025,
      host: "localhost",
      port: portOf(env.MAILPIT_SMTP_PORT, COMPOSE_DEFAULTS.mailpitSmtpPort),
    },
    {
      kind: "mailpit-ui",
      label: "Mailpit (web UI)",
      service: "mailpit",
      containerPort: 8025,
      host: "localhost",
      port: portOf(env.MAILPIT_UI_PORT, COMPOSE_DEFAULTS.mailpitUiPort),
    },
  );

  return list;
}

function portOf(value: string | undefined, fallback: number): number {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : fallback;
}

// ---------------------------------------------------------------------------------------------
// Looking at the machine

/** Opens a TCP connection and runs `onConnect` on it; resolves with what it returns, or `false`. */
function withSocket<T>(
  host: string,
  port: number,
  timeoutMs: number,
  onConnect: (socket: net.Socket, done: (value: T | false) => void) => void,
): Promise<T | false> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    let finished = false;
    const done = (value: T | false) => {
      if (finished) return;
      finished = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.on("error", () => done(false));
    socket.on("close", () => done(false));
    socket.on("connect", () => onConnect(socket, done));
  });
}

/** True when something accepts a TCP connection on host:port. */
export async function canConnect(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return (await withSocket<true>(host, port, timeoutMs, (_socket, done) => done(true))) === true;
}

/** True when a Redis answers `PING` with `PONG`: "established" log lines prove nothing (T06 item 5). */
export async function redisAnswers(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  const reply = await withSocket<string>(host, port, timeoutMs, (socket, done) => {
    socket.on("data", (data) => done(data.toString("utf8")));
    socket.write("*1\r\n$4\r\nPING\r\n");
  });
  return typeof reply === "string" && reply.startsWith("+PONG");
}

/**
 * True when a Postgres answers. Sends the protocol's SSLRequest (8 bytes) and expects the one-byte
 * reply `S` or `N`; a server that does not speak Postgres does not answer that way. No login is
 * needed, so no password is involved.
 */
export async function postgresAnswers(
  host: string,
  port: number,
  timeoutMs = 2000,
): Promise<boolean> {
  const reply = await withSocket<string>(host, port, timeoutMs, (socket, done) => {
    socket.on("data", (data) => done(data.toString("latin1")));
    socket.write(Buffer.from([0, 0, 0, 8, 4, 210, 22, 47]));
  });
  return reply === "S" || reply === "N";
}

/** True when Meilisearch's `/health` says `available`. */
export async function meilisearchAnswers(
  host: string,
  port: number,
  timeoutMs = 2000,
): Promise<boolean> {
  try {
    const response = await fetch(`http://${addressOf({ host, port })}/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { status?: unknown };
    return body.status === "available";
  } catch {
    return false;
  }
}

/** Whether the service on `target`'s port answers the way that kind of service does. */
export function answers(target: Target, timeoutMs = 2000): Promise<boolean> {
  switch (target.kind) {
    case "postgres":
      return postgresAnswers(target.host, target.port, timeoutMs);
    case "redis":
      return redisAnswers(target.host, target.port, timeoutMs);
    case "meilisearch":
      return meilisearchAnswers(target.host, target.port, timeoutMs);
    default:
      return canConnect(target.host, target.port, timeoutMs);
  }
}

// ---------------------------------------------------------------------------------------------
// Which project owns a port

export type ComposeObservation =
  /** Docker is there, and the stack publishes these host ports for the service's container port. */
  | { status: "published"; ports: number[] }
  /** Docker is there, and the service is not running (or doesn't publish that port). */
  | { status: "not-published" }
  | { status: "docker-unavailable"; reason: string };

/** The host ports in the output of `docker compose port`: `0.0.0.0:15432` and `[::]:15432`. */
export function parseComposePorts(output: string): number[] {
  const ports = new Set<number>();
  for (const line of output.split(/\r?\n/)) {
    const match = /:(\d+)\s*$/.exec(line.trim());
    if (match) ports.add(Number(match[1]));
  }
  return [...ports];
}

export async function observeCompose(
  target: Pick<Target, "service" | "containerPort">,
  cwd: string,
): Promise<ComposeObservation> {
  const info = await run("docker", ["info", "--format", "{{.ServerVersion}}"], {
    cwd,
    timeoutMs: 20_000,
  });
  if (info.code !== 0) {
    const reason = info.error ?? (info.output.trim().split(/\r?\n/).at(-1) || "docker info failed");
    return { status: "docker-unavailable", reason };
  }
  const result = await run(
    "docker",
    ["compose", "port", target.service, String(target.containerPort)],
    {
      cwd,
      timeoutMs: 20_000,
    },
  );
  const ports = result.code === 0 ? parseComposePorts(result.output) : [];
  return ports.length > 0 ? { status: "published", ports } : { status: "not-published" };
}

// ---------------------------------------------------------------------------------------------
// The verdict

export type Finding = {
  level: "ok" | "warn" | "error";
  target: Target;
  message: string;
  /** Set when the finding is a warning only because Docker could not be asked. */
  dockerReason?: string;
};

export type Observation = {
  target: Target;
  reachable: boolean;
  /** Only meaningful when `reachable`: does it speak the service's protocol? */
  speaksProtocol: boolean;
  compose: ComposeObservation;
};

export const START_STACK = "Start the stack with `pnpm infra:up` (docker compose up -d --wait).";

/** What to say about one service. Pure: the tests feed it every combination. */
export function judge(observation: Observation): Finding {
  const { target, reachable, speaksProtocol, compose } = observation;
  const where = addressOf(target);
  const finding = (level: Finding["level"], message: string): Finding => ({
    level,
    target,
    message,
  });

  if (!reachable) {
    const extra = target.hint ? ` (${target.hint})` : "";
    return finding("error", `${target.label} is not reachable at ${where}. ${START_STACK}${extra}`);
  }
  if (!speaksProtocol) {
    return finding(
      "error",
      `Something answers at ${where} but it does not behave like ${target.label.split(" (")[0]}. Is another program using the port? Check the ports in the .env files and in infra/docker-compose.yml.`,
    );
  }
  if (!isLocalHost(target.host)) {
    return finding(
      "ok",
      `${target.label} at ${where}: a remote server, so its owner can't be checked here`,
    );
  }

  switch (compose.status) {
    case "published":
      if (compose.ports.includes(target.port)) {
        return finding(
          "ok",
          `${target.label} at ${where} is this project's ${target.service} container`,
        );
      }
      return finding(
        "error",
        `${target.label} is configured for ${where}, but this project's ${target.service} container publishes port ${compose.ports.join(" and ")}, so the service answering on ${target.port} belongs to something else (D15). Fix the port in the .env file, or stop the other service.`,
      );
    case "not-published":
      return finding(
        "error",
        `${target.label} answers at ${where}, but this project's compose stack does not publish ${target.service} (it is not running), so the service there belongs to something else (D15). ${START_STACK}`,
      );
    case "docker-unavailable":
      return {
        ...finding(
          "warn",
          `Docker is not available (${compose.reason}), so I can't check that ${where} is this project's ${target.service}. Migrations and seeds will write to whatever answers there.`,
        ),
        dockerReason: compose.reason,
      };
  }
}

/**
 * One warning for all the services that could not be checked because Docker is not there, instead
 * of one per service. It names the host and port the migrations will write to: when Docker is
 * missing, that sentence is the only protection against a service that isn't ours (D15).
 */
export function dockerUnavailableWarning(findings: readonly Finding[]): string | undefined {
  const unchecked = findings.filter((finding) => finding.dockerReason !== undefined);
  const first = unchecked[0];
  if (first?.dockerReason === undefined) return undefined;

  const where = (finding: Finding) => addressOf(finding.target);
  const databases = unchecked.filter((finding) => finding.target.kind === "postgres");
  const writes =
    databases.length > 0
      ? `Migrations and seeds will write to the Postgres at ${databases.map(where).join(" and ")}, whatever that is`
      : "Migrations and seeds will write to whatever answers on those ports";
  const list = unchecked
    .map((finding) => `${finding.target.label.split(" (")[0]} ${where(finding)}`)
    .join(", ");
  return `Docker is not available (${first.dockerReason}), so I can't check that these are this project's services: ${list}. ${writes}.`;
}
