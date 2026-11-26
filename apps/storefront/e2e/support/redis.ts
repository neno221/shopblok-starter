import { connect } from "node:net";

// One Redis command over a plain socket (RESP), for a spec that only needs to look (T112's
// `cache-freshness.spec.ts`: whether Medusa's caching module wrote anything). No client library:
// the storefront has none, and one integer reply is all a spec reads.

/** How many keys match `pattern` (Redis's `KEYS` through `EVAL`, which answers one integer). */
export async function countKeys(redisUrl: string, pattern: string): Promise<number> {
  const url = new URL(redisUrl);
  const args = ["EVAL", "return #redis.call('KEYS', ARGV[1])", "0", pattern];
  const command = `*${args.length}\r\n${args.map((arg) => `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`).join("")}`;
  const reply = await new Promise<string>((resolve, reject) => {
    const socket = connect(Number(url.port || 6379), url.hostname);
    let answer = "";
    socket.setTimeout(5_000, () => socket.destroy(new Error(`Redis at ${url.host}: no answer`)));
    socket.on("error", reject);
    socket.on("connect", () => socket.write(command));
    socket.on("data", (chunk) => {
      answer += chunk.toString("utf8");
      if (answer.endsWith("\r\n")) {
        socket.end();
        resolve(answer);
      }
    });
  });
  const match = /^:(\d+)\r\n$/.exec(reply);
  if (match === null) throw new Error(`Redis at ${url.host} answered ${JSON.stringify(reply)}`);
  return Number(match[1]);
}
