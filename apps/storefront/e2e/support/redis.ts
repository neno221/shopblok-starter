import { connect } from "node:net";

// One Redis command over a plain socket (RESP), for a spec that only needs to look (T112's
// `cache-freshness.spec.ts`: whether Medusa's caching module wrote anything). No client library:
// the storefront has none, and one integer reply is all a spec reads. Only a plain
// `redis://host:port` (the compose stack's and CI's): a password, a database or TLS is refused
// rather than ignored (PR 150 review, item 5).

/** Runs a Lua `script` with `pattern` as ARGV[1]; the script answers one integer. */
async function evalInteger(redisUrl: string, script: string, pattern: string): Promise<number> {
  const url = new URL(redisUrl);
  if (url.protocol !== "redis:" || url.username || url.password || url.pathname.length > 1) {
    throw new Error(
      `e2e/support/redis.ts speaks plain RESP to redis://host:port only, not ${url.protocol}//… with a password, database or TLS`,
    );
  }
  const args = ["EVAL", script, "0", pattern];
  const command = `*${args.length}\r\n${args.map((arg) => `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`).join("")}`;
  const reply = await new Promise<string>((resolve, reject) => {
    const socket = connect(Number(url.port || 6379), url.hostname.replace(/^\[|\]$/g, ""));
    let answer = "";
    socket.setTimeout(5_000, () => socket.destroy(new Error(`Redis at ${url.host}: no answer`)));
    socket.on("error", reject);
    // A close before a whole reply would leave the promise pending until the test's timeout; after
    // `resolve` this reject does nothing.
    socket.on("close", () => reject(new Error(`Redis at ${url.host} closed without a reply`)));
    socket.on("connect", () => socket.write(command));
    socket.on("data", (chunk) => {
      answer += chunk.toString("utf8");
      if (answer.endsWith("\r\n")) {
        resolve(answer);
        socket.end();
      }
    });
  });
  const match = /^:(\d+)\r\n$/.exec(reply);
  if (match === null) throw new Error(`Redis at ${url.host} answered ${JSON.stringify(reply)}`);
  return Number(match[1]);
}

/** How many keys match `pattern` (Redis's `KEYS` through `EVAL`). */
export function countKeys(redisUrl: string, pattern: string): Promise<number> {
  return evalInteger(redisUrl, "return #redis.call('KEYS', ARGV[1])", pattern);
}

/** Removes every key matching `pattern` (Redis's `UNLINK`); answers how many there were. */
export function clearKeys(redisUrl: string, pattern: string): Promise<number> {
  return evalInteger(
    redisUrl,
    "local keys = redis.call('KEYS', ARGV[1]) for _, key in ipairs(keys) do redis.call('UNLINK', key) end return #keys",
    pattern,
  );
}
