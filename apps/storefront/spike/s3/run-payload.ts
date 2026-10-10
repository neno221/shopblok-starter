// S3 PROTOTYPE. `payload run <script>` against a throwaway database with S3's environment, with the
// silent-exit repeat. Prints the line of JSON the script writes.
//   node spike/s3/run-payload.ts <db-suffix> <script> [four] [--env KEY=VALUE]...
import { payloadCli } from "./lib.ts";

const [suffix, script, ...rest] = process.argv.slice(2);
if (!suffix || !script) throw new Error("usage: run-payload.ts <suffix> <script> [four]");
const four = rest.includes("four");
const extra = Object.fromEntries(
  rest.filter((a) => a.includes("=")).map((a) => [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)]),
);
const result = await payloadCli(["run", script], { database: `payload_s3_${suffix}`, locales: four ? "four" : undefined, rich: !rest.includes("plain") });
void extra;
process.stdout.write(result.output);
console.error(`payload run ${script}: exit ${result.code}, ${result.ms} ms`);
process.exit(result.code ?? 1);
