import { extractPublishableKey, formatPublishableKey } from "../publishable-key";

const KEY = `pk_${"a1".repeat(32)}`;

describe("publishable key line", () => {
  it("is one line of JSON with a publishableKey field", () => {
    const line = formatPublishableKey(KEY);

    expect(line).toBe(`{"publishableKey":"${KEY}"}`);
    expect(line).not.toContain("\n");
  });

  it("is found among Medusa's own log lines", () => {
    const output = [
      "\u001b[32minfo\u001b[39m:    Executing script at ./src/scripts/print-publishable-key.ts...",
      "\u001b[32minfo\u001b[39m:    Connection to Redis in module 'event-bus-redis' established",
      formatPublishableKey(KEY),
      "\u001b[32minfo\u001b[39m:    Finished executing script.",
    ].join("\n");

    expect(extractPublishableKey(output)).toBe(KEY);
    expect(extractPublishableKey(output.replace(/\n/g, "\r\n"))).toBe(KEY);
  });

  it("is not found when the script printed nothing, or a lookalike", () => {
    expect(extractPublishableKey("")).toBeUndefined();
    expect(extractPublishableKey("info: Finished executing script.")).toBeUndefined();
    expect(extractPublishableKey('{"publishableKey":"sk_secret"}')).toBeUndefined();
    expect(extractPublishableKey('{"publishableKey":42}')).toBeUndefined();
    expect(extractPublishableKey('{"publishableKey": broken')).toBeUndefined();
  });

  it("takes the last matching line", () => {
    const other = `pk_${"b2".repeat(32)}`;

    expect(
      extractPublishableKey([formatPublishableKey(other), formatPublishableKey(KEY)].join("\n")),
    ).toBe(KEY);
  });
});
