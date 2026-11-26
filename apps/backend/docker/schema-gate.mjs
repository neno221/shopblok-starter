// The worker's wait for the server's migrations (M7 D132, D135; PR 149's review, item 3).
//
// Railway builds Medusa's server and worker from the same push, and only the server's predeploy
// migrates (two `medusa db:migrate` at once are not safe: Medusa takes no lock). So the server
// marks each revision once its migrations are done, and the worker's predeploy waits for its own
// revision's mark before Railway starts it: new worker code never runs on the old schema. A
// revision marked once stays marked, so redeploying or rolling back to an older one passes at once.
//
//   node schema-gate.mjs mark    after the server's migrations (`shopblok predeploy`)
//   node schema-gate.mjs wait    the worker's predeploy (`shopblok predeploy-worker`)
//
// The revision is Railway's `RAILWAY_GIT_COMMIT_SHA`, or `SHOPBLOK_REVISION` (CI's boot test).
// Without either, both do nothing and say so (a local run). `SCHEMA_WAIT_SECONDS` (default 840,
// inside the predeploy's 900) bounds the wait; at the end the predeploy fails, and Railway keeps
// the worker that runs. Connects as Medusa does: TLS, the certificate not verified, unless the
// address is localhost or says `sslmode=disable`. Prints no address and no value.
import pg from "@medusajs/framework/pg";

const TABLE = "shopblok_schema_revision";

const revision = (process.env.RAILWAY_GIT_COMMIT_SHA || process.env.SHOPBLOK_REVISION || "").trim();
const command = process.argv[2];

function clientConfig(url) {
  const parsed = new URL(url);
  const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  const disabled = parsed.searchParams.get("sslmode") === "disable";
  parsed.searchParams.delete("sslmode");
  return {
    connectionString: parsed.toString(),
    ssl: local || disabled ? false : { rejectUnauthorized: false },
  };
}

async function withClient(run) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = new pg.Client(clientConfig(url));
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

const ensureTable = (client) =>
  client.query(
    `CREATE TABLE IF NOT EXISTS ${TABLE} (revision text PRIMARY KEY, marked_at timestamptz NOT NULL DEFAULT now())`,
  );

async function mark() {
  await withClient(async (client) => {
    await ensureTable(client);
    await client.query(`INSERT INTO ${TABLE} (revision) VALUES ($1) ON CONFLICT DO NOTHING`, [
      revision,
    ]);
  });
  console.log(`schema-gate: the migrations of ${revision.slice(0, 12)} are done`);
}

async function marked() {
  return withClient(async (client) => {
    const exists = await client.query("SELECT to_regclass($1) AS name", [TABLE]);
    if (exists.rows[0]?.name === null) return false;
    const found = await client.query(`SELECT 1 FROM ${TABLE} WHERE revision = $1`, [revision]);
    return found.rowCount > 0;
  });
}

async function wait() {
  const seconds = Number(process.env.SCHEMA_WAIT_SECONDS || 840);
  const deadline = Date.now() + seconds * 1000;
  console.log(`schema-gate: waiting for the server's migrations of ${revision.slice(0, 12)}`);
  for (;;) {
    if (await marked()) {
      console.log("schema-gate: the schema is ready");
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `the server has not finished the migrations of ${revision.slice(0, 12)} within ${seconds} s (its predeploy failed or is still running), so the worker keeps its last deployment`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

if (command !== "mark" && command !== "wait") {
  console.error("schema-gate: mark or wait");
  process.exit(2);
}
if (revision === "") {
  console.log(
    "schema-gate: no RAILWAY_GIT_COMMIT_SHA or SHOPBLOK_REVISION, so there is no revision to mark or wait for",
  );
  process.exit(0);
}
try {
  await (command === "mark" ? mark() : wait());
} catch (error) {
  console.error(`schema-gate: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
