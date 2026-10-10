import http from "node:http";
import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import {
  canConnect,
  dockerUnavailableWarning,
  judge,
  meilisearchAnswers,
  parseComposePorts,
  postgresAnswers,
  redisAnswers,
  satisfies,
  targetsFrom,
  type Observation,
  type Target,
} from "./checks.ts";

describe("satisfies", () => {
  it("reads the engines ranges of this repo", () => {
    expect(satisfies("v22.22.0", ">=22.22.0 <25")).toBe(true);
    expect(satisfies("22.22.5", ">=22.22.0 <25")).toBe(true);
    expect(satisfies("24.9.0", ">=22.22.0 <25")).toBe(true);
    expect(satisfies("22.21.9", ">=22.22.0 <25")).toBe(false);
    expect(satisfies("25.0.0", ">=22.22.0 <25")).toBe(false);
    expect(satisfies("20.19.0", ">=22.22.0 <25")).toBe(false);
    expect(satisfies("12.10.1", ">=12.10.1 <13")).toBe(true);
    expect(satisfies("12.10.0", ">=12.10.1 <13")).toBe(false);
    expect(satisfies("13.0.0", ">=12.10.1 <13")).toBe(false);
  });

  it("knows each operator", () => {
    expect(satisfies("1.2.3", "1.2.3")).toBe(true);
    expect(satisfies("1.2.4", "=1.2.3")).toBe(false);
    expect(satisfies("1.2.4", ">1.2.3")).toBe(true);
    expect(satisfies("1.2.3", ">1.2.3")).toBe(false);
    expect(satisfies("1.2.3", "<=1.2.3")).toBe(true);
    expect(satisfies("1.2.3", "<1.2.3")).toBe(false);
  });

  it("is not satisfied by something it cannot read", () => {
    expect(satisfies("not a version", ">=1")).toBe(false);
    expect(satisfies("1.0.0", "")).toBe(false);
    expect(satisfies("1.0.0", ">=oops")).toBe(false);
  });
});

describe("targetsFrom", () => {
  const env = {
    DATABASE_URL: "postgres://postgres:postgres@localhost:15432/medusa",
    PAYLOAD_DATABASE_URL: "postgres://postgres:postgres@localhost:15432/payload",
    REDIS_URL: "redis://localhost:6380",
    MEILISEARCH_HOST: "http://localhost:7701",
  };

  it("reads each port from the URL the apps use (D15)", () => {
    const targets = targetsFrom(env);
    expect(targets.map((t) => [t.kind, t.host, t.port])).toEqual([
      ["postgres", "localhost", 15432],
      ["redis", "localhost", 6380],
      ["meilisearch", "localhost", 7701],
      ["mailpit-smtp", "localhost", 1025],
      ["mailpit-ui", "localhost", 8025],
    ]);
  });

  it("checks one Postgres once when both databases are on the same server", () => {
    const targets = targetsFrom(env).filter((t) => t.kind === "postgres");
    expect(targets).toHaveLength(1);
    expect(targets[0]?.label).toBe("Postgres (medusa and payload databases)");
  });

  it("checks both when the databases are on different servers", () => {
    const targets = targetsFrom({
      ...env,
      PAYLOAD_DATABASE_URL: "postgres://u:p@localhost:5433/payload",
    }).filter((t) => t.kind === "postgres");
    expect(targets.map((t) => [t.label, t.port])).toEqual([
      ["Postgres (medusa database)", 15432],
      ["Postgres (payload database)", 5433],
    ]);
  });

  it("follows an edited port, so a changed .env is what gets checked", () => {
    const targets = targetsFrom({
      ...env,
      DATABASE_URL: "postgres://u:p@127.0.0.1:5432/medusa",
      PAYLOAD_DATABASE_URL: "postgres://u:p@127.0.0.1:5432/payload",
      REDIS_URL: "redis://localhost:6390",
    });
    expect(targets[0]).toMatchObject({ host: "127.0.0.1", port: 5432 });
    expect(targets.find((t) => t.kind === "redis")?.port).toBe(6390);
  });

  it("uses the standard port of a URL that names none, and the compose default of a missing one", () => {
    const targets = targetsFrom({ DATABASE_URL: "postgres://u:p@db.example.com/medusa" });
    expect(targets.filter((t) => t.kind === "postgres").map((t) => [t.host, t.port])).toEqual([
      ["db.example.com", 5432],
      ["localhost", 15432],
    ]);
    expect(targets.find((t) => t.kind === "meilisearch")).toMatchObject({
      host: "localhost",
      port: 7701,
    });
  });

  it("has no Redis to check when REDIS_URL is blank (the in-memory modules, T06)", () => {
    expect(targetsFrom({ ...env, REDIS_URL: "" }).some((t) => t.kind === "redis")).toBe(false);
    expect(targetsFrom({ ...env, REDIS_URL: undefined }).some((t) => t.kind === "redis")).toBe(
      false,
    );
  });

  it("takes Mailpit's ports from the environment when they are set", () => {
    const targets = targetsFrom({
      ...env,
      MAILPIT_SMTP_PORT: "2025",
      MAILPIT_UI_PORT: "not a port",
    });
    expect(targets.find((t) => t.kind === "mailpit-smtp")?.port).toBe(2025);
    expect(targets.find((t) => t.kind === "mailpit-ui")?.port).toBe(8025);
  });
});

describe("parseComposePorts", () => {
  it("reads the output of docker compose port", () => {
    expect(parseComposePorts("0.0.0.0:15432\n")).toEqual([15432]);
    expect(parseComposePorts("0.0.0.0:15432\n[::]:15432\n")).toEqual([15432]);
    expect(parseComposePorts("0.0.0.0:6380\r\n[::]:6381\r\n")).toEqual([6380, 6381]);
    expect(parseComposePorts("")).toEqual([]);
    expect(parseComposePorts("no container found for port 5432/tcp")).toEqual([]);
  });
});

describe("judge", () => {
  const target: Target = {
    label: "Postgres (medusa database)",
    kind: "postgres",
    service: "postgres",
    containerPort: 5432,
    host: "localhost",
    port: 15432,
  };
  const observe = (overrides: Partial<Observation>): Observation => ({
    target,
    reachable: true,
    speaksProtocol: true,
    compose: { status: "published", ports: [15432] },
    ...overrides,
  });

  it("is happy when this project's container publishes the configured port", () => {
    const finding = judge(observe({}));
    expect(finding.level).toBe("ok");
    expect(finding.message).toContain("this project's postgres container");
  });

  it("is happy with an IPv6 line next to the IPv4 one", () => {
    expect(judge(observe({ compose: { status: "published", ports: [15432, 15432] } })).level).toBe(
      "ok",
    );
  });

  it("is an error, with the start-the-stack hint, when nothing answers", () => {
    const finding = judge(observe({ reachable: false, speaksProtocol: false }));
    expect(finding.level).toBe("error");
    expect(finding.message).toContain("localhost:15432");
    expect(finding.message).toContain("pnpm infra:up");
  });

  it("adds the target's own hint to a missing service", () => {
    const redis: Target = {
      ...target,
      label: "Redis",
      kind: "redis",
      service: "redis",
      hint: "the backend never starts when Redis is down",
    };
    const finding = judge(observe({ target: redis, reachable: false, speaksProtocol: false }));
    expect(finding.message).toContain("the backend never starts when Redis is down");
  });

  it("is an error when another project's service answers on the port (D15)", () => {
    const finding = judge(observe({ compose: { status: "published", ports: [15433] } }));
    expect(finding.level).toBe("error");
    expect(finding.message).toContain("publishes port 15433");
    expect(finding.message).toContain("belongs to something else");
  });

  it("is an error when the stack is not running but something answers on the port", () => {
    const finding = judge(observe({ compose: { status: "not-published" } }));
    expect(finding.level).toBe("error");
    expect(finding.message).toContain("is not running");
  });

  it("only warns when Docker is not there, and names the host and port that will be written to", () => {
    const finding = judge(
      observe({ compose: { status: "docker-unavailable", reason: "no daemon" } }),
    );
    expect(finding.level).toBe("warn");
    expect(finding.message).toContain("localhost:15432");
    expect(finding.message).toContain("Migrations and seeds will write");
  });

  it("makes one warning of several that Docker could not check, naming the databases' host and port", () => {
    const docker = { status: "docker-unavailable", reason: "no daemon" } as const;
    const redis: Target = {
      ...target,
      label: "Redis",
      kind: "redis",
      service: "redis",
      port: 6380,
    };
    const findings = [
      judge(observe({ compose: docker })),
      judge(observe({ target: redis, compose: docker })),
    ];
    const warning = dockerUnavailableWarning(findings);
    expect(warning).toContain("Docker is not available (no daemon)");
    expect(warning).toContain("Postgres localhost:15432, Redis localhost:6380");
    expect(warning).toContain("write to the Postgres at localhost:15432");
    expect(warning).toMatch(/\.$/);
  });

  it("has no Docker warning when Docker answered, or when the only findings are other warnings", () => {
    expect(dockerUnavailableWarning([judge(observe({}))])).toBeUndefined();
    expect(dockerUnavailableWarning([])).toBeUndefined();
  });

  it("is an error when the port is open but the program there is not the service", () => {
    const finding = judge(observe({ speaksProtocol: false }));
    expect(finding.level).toBe("error");
    expect(finding.message).toContain("does not behave like Postgres");
  });

  it("does not claim a remote server is ours, and does not fail it", () => {
    const remote = { ...target, host: "db.example.com" };
    const finding = judge(
      observe({ target: remote, compose: { status: "published", ports: [1] } }),
    );
    expect(finding.level).toBe("ok");
    expect(finding.message).toContain("remote");
  });
});

// ---- the probes, against small servers of our own --------------------------------------------

const servers: { close: () => void }[] = [];
afterEach(() => {
  for (const server of servers.splice(0)) server.close();
});

function listen(handler: (socket: net.Socket) => void): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer(handler);
    servers.push({ close: () => server.close() });
    server.listen(0, "127.0.0.1", () => resolve((server.address() as net.AddressInfo).port));
  });
}

async function closedPort(): Promise<number> {
  const port = await listen(() => {});
  servers.pop()?.close();
  await new Promise((r) => setTimeout(r, 20));
  return port;
}

describe("probes", () => {
  it("canConnect sees an open port and a closed one", async () => {
    const open = await listen((socket) => socket.end());
    expect(await canConnect("127.0.0.1", open)).toBe(true);
    expect(await canConnect("127.0.0.1", await closedPort(), 500)).toBe(false);
  });

  it("redisAnswers needs a PONG, not just an open port", async () => {
    const redis = await listen((socket) => {
      socket.on("data", (data) => {
        if (data.toString().includes("PING")) socket.write("+PONG\r\n");
      });
    });
    const silent = await listen(() => {});
    const loading = await listen((socket) => {
      socket.on("data", () => socket.write("-LOADING Redis is loading the dataset in memory\r\n"));
    });
    expect(await redisAnswers("127.0.0.1", redis)).toBe(true);
    expect(await redisAnswers("127.0.0.1", silent, 300)).toBe(false);
    expect(await redisAnswers("127.0.0.1", loading)).toBe(false);
    expect(await redisAnswers("127.0.0.1", await closedPort(), 300)).toBe(false);
  });

  it("postgresAnswers sends an SSLRequest and wants S or N back", async () => {
    let received: Buffer | undefined;
    const postgres = await listen((socket) => {
      socket.once("data", (data) => {
        received = data;
        socket.write("N");
      });
    });
    const notPostgres = await listen((socket) => {
      socket.once("data", () => socket.write("HTTP/1.1 400 Bad Request\r\n\r\n"));
    });
    expect(await postgresAnswers("127.0.0.1", postgres)).toBe(true);
    expect([...(received ?? [])]).toEqual([0, 0, 0, 8, 4, 210, 22, 47]);
    expect(await postgresAnswers("127.0.0.1", notPostgres)).toBe(false);
  });

  it("meilisearchAnswers wants /health to say available", async () => {
    const serve = (body: string, status = 200) =>
      new Promise<number>((resolve) => {
        const server = http.createServer((req, res) => {
          res.statusCode = req.url === "/health" ? status : 404;
          res.setHeader("content-type", "application/json");
          res.end(body);
        });
        servers.push({ close: () => server.close() });
        server.listen(0, "127.0.0.1", () => resolve((server.address() as net.AddressInfo).port));
      });
    expect(await meilisearchAnswers("127.0.0.1", await serve('{"status":"available"}'))).toBe(true);
    expect(await meilisearchAnswers("127.0.0.1", await serve('{"status":"booting"}'))).toBe(false);
    expect(await meilisearchAnswers("127.0.0.1", await serve("{}", 503))).toBe(false);
    expect(await meilisearchAnswers("127.0.0.1", await closedPort(), 300)).toBe(false);
  });
});
