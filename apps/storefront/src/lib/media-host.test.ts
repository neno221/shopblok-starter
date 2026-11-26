import { describe, expect, it } from "vitest";
import { mediaRemotePatterns } from "./media-host";

describe("mediaRemotePatterns (M6 D127)", () => {
  it("names S3_PUBLIC_URL's host, and only paths under its own", () => {
    expect(mediaRemotePatterns({ S3_PUBLIC_URL: " https://pub-abc.r2.dev/ " })).toEqual([
      { protocol: "https", hostname: "pub-abc.r2.dev", port: "", pathname: "/**" },
    ]);
    expect(mediaRemotePatterns({ S3_PUBLIC_URL: "http://localhost:9090/shopblok-dev" })).toEqual([
      { protocol: "http", hostname: "localhost", port: "9090", pathname: "/shopblok-dev/**" },
    ]);
  });

  it("names none without it", () => {
    expect(mediaRemotePatterns({})).toEqual([]);
    expect(mediaRemotePatterns({ S3_PUBLIC_URL: " " })).toEqual([]);
  });

  it("refuses a value that is not an http(s) URL, so the build stops", () => {
    expect(() => mediaRemotePatterns({ S3_PUBLIC_URL: "media.example.com" })).toThrow(/not a URL/);
    expect(() => mediaRemotePatterns({ S3_PUBLIC_URL: "ftp://media.example.com" })).toThrow(/http/);
  });
});
