import { describe, expect, it } from "vitest";
import type { AppEnvs } from "@shopblok/integrations";
import type { HttpResult } from "./http.ts";
import {
  firstKey,
  r2BucketCheck,
  r2Buckets,
  r2CorsCheck,
  r2KeyChecks,
  r2PrivateCheck,
  type R2Bucket,
} from "./r2-checks.ts";
import { IMPORT_UPLOAD_RULE, corsXml, withAdminOrigins } from "./s3.ts";

// Stand-ins, not keys (D115).
const shared = {
  S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  S3_ACCESS_KEY_ID: "id",
  S3_SECRET_ACCESS_KEY: "secret",
  S3_BUCKET: "shop-dev",
  S3_PUBLIC_URL: "https://pub-1.r2.dev",
};
const envs: AppEnvs = {
  backend: { ...shared, S3_PRIVATE_BUCKET: "shop-dev-private" },
  storefront: shared,
};
const answer = (status: number, text = ""): HttpResult => ({ kind: "response", status, text });
const publicBucket: R2Bucket = {
  apps: ["backend", "storefront"],
  bucket: "shop-dev",
  role: "public",
};

describe("r2Buckets", () => {
  it("asks once for a public bucket both apps name, and for the backend's private one", () => {
    expect(r2Buckets(envs)).toEqual([
      publicBucket,
      { apps: ["backend"], bucket: "shop-dev-private", role: "private" },
    ]);
  });

  it("skips an app without the keys to sign with", () => {
    expect(r2Buckets({ backend: {}, storefront: { ...shared, S3_SECRET_ACCESS_KEY: "" } })).toEqual(
      [],
    );
  });
});

describe("r2KeyChecks", () => {
  it("is silent for a good setup and without keys", () => {
    expect(r2KeyChecks(envs)).toEqual([]);
    expect(r2KeyChecks({ backend: {}, storefront: {} })).toEqual([]);
  });

  it("refuses one bucket for public and private files", () => {
    const [check] = r2KeyChecks({
      ...envs,
      backend: { ...envs.backend, S3_PRIVATE_BUCKET: "shop-dev" },
    });
    expect(check?.level).toBe("error");
    expect(check?.details?.join("\n")).toContain(
      "apps/backend: S3_BUCKET is the backend's S3_PRIVATE_BUCKET",
    );
    expect(check?.details?.join("\n")).toContain("apps/storefront");
  });

  it("refuses the S3 API's endpoint as the public URL, and a public URL that is not one", () => {
    const [check] = r2KeyChecks({
      backend: {
        ...envs.backend,
        S3_PUBLIC_URL: "https://account.r2.cloudflarestorage.com/shop-dev",
      },
      storefront: { ...shared, S3_PUBLIC_URL: "media.example.com" },
    });
    expect(check?.level).toBe("error");
    expect(check?.details).toEqual([
      "apps/backend: S3_PUBLIC_URL is the S3 API's endpoint, which serves no file without a signature",
      "apps/storefront: S3_PUBLIC_URL is not a URL such as https://media.example.com",
    ]);
  });

  it("warns when the apps name one public URL for two buckets", () => {
    const checks = r2KeyChecks({ ...envs, storefront: { ...shared, S3_BUCKET: "other" } });
    expect(checks.map((c) => [c.id, c.level])).toEqual([["r2-urls", "warn"]]);
  });

  it("refuses a backend public URL that next/image does not take (the storefront's)", () => {
    const [check] = r2KeyChecks({
      backend: { ...envs.backend, S3_BUCKET: "other", S3_PUBLIC_URL: "https://pub-2.r2.dev" },
      storefront: shared,
    });
    expect(check?.level).toBe("error");
    expect(check?.details?.[0]).toMatch(
      /^apps\/backend: S3_PUBLIC_URL is not under the storefront's/,
    );
    expect(check?.details?.[0]).toContain("one S3_PUBLIC_URL in both apps");
    // Under the storefront's path is fine, a sibling path is not.
    const under = (backendUrl: string, storefrontUrl: string) =>
      r2KeyChecks({
        backend: { ...envs.backend, S3_PUBLIC_URL: backendUrl },
        storefront: { ...shared, S3_PUBLIC_URL: storefrontUrl },
      });
    expect(under("https://cdn.example/shop/", "https://cdn.example/shop")).toEqual([]);
    expect(under("https://cdn.example/shop2", "https://cdn.example/shop")[0]?.level).toBe("error");
  });
});

describe("r2BucketCheck", () => {
  it.each([
    [answer(200), "ok", /answers for the public bucket shop-dev/],
    [answer(404), "error", /has no the public bucket|no the public|HTTP 404/],
    [answer(403), "error", /refuses these keys/],
    [answer(500), "warn", /HTTP 500/],
    [
      { kind: "unreachable", reason: "no answer within 15 s" } as HttpResult,
      "warn",
      /does not answer/,
    ],
  ])("reads %j", (result, level, message) => {
    const check = r2BucketCheck(publicBucket, result);
    expect(check.level).toBe(level);
    expect(check.message).toMatch(message);
    expect(check.title).toBe("R2 bucket answers: public (apps/backend and apps/storefront)");
  });
});

describe("r2CorsCheck", () => {
  const origin = "https://shop.example";
  const rule = (origins: string[]) => corsXml(withAdminOrigins([], origins).rules);

  it("is ok when a PUT rule names the admin's origin", () => {
    expect(r2CorsCheck(publicBucket, origin, answer(200, rule([origin]))).level).toBe("ok");
  });

  it("is an error with no rule (404) or none for this origin", () => {
    expect(r2CorsCheck(publicBucket, origin, answer(404)).level).toBe("error");
    const other = r2CorsCheck(publicBucket, origin, answer(200, rule(["http://localhost:8000"])));
    expect(other.level).toBe("error");
    expect(other.details).toEqual(["GET, HEAD, PUT from http://localhost:8000"]);
    expect(other.fix).toContain("pnpm r2:cors");
  });

  it("warns about any origin (*)", () => {
    expect(r2CorsCheck(publicBucket, origin, answer(200, rule(["*"]))).level).toBe("warn");
  });

  it("warns when the token may not read the rules (an Object Read & Write token: 403)", () => {
    const check = r2CorsCheck(publicBucket, origin, answer(403));
    expect(check.level).toBe("warn");
    expect(check.message).toMatch(/Object Read & Write/);
    expect(check.fix).toContain("pnpm r2:cors --json");
  });

  it("checks the private bucket for Medusa Admin's import (PUT with the CSV's type)", () => {
    const privateBucket: R2Bucket = {
      apps: ["backend"],
      bucket: "shop-dev-private",
      role: "private",
    };
    const medusa = "https://api.shop.example";
    const importRule = (origins: string[]) =>
      corsXml(withAdminOrigins([], origins, IMPORT_UPLOAD_RULE).rules);
    const ok = r2CorsCheck(privateBucket, medusa, answer(200, importRule([medusa])));
    expect([ok.id, ok.level]).toEqual(["r2-cors-private", "ok"]);
    const none = r2CorsCheck(privateBucket, medusa, answer(404));
    expect([none.level, none.message]).toEqual([
      "error",
      expect.stringContaining("Medusa Admin's product import"),
    ]);
    expect(r2CorsCheck(privateBucket, medusa, answer(200, importRule([origin]))).level).toBe(
      "error",
    );
  });
});

describe("r2PrivateCheck", () => {
  const base = { bucket: "shop-dev-private", key: "private/export.csv" };

  it("is ok when R2 refuses the unsigned read and the public URL does not serve the file", () => {
    const check = r2PrivateCheck({ ...base, api: answer(400), publicDomain: answer(404) });
    expect(check.level).toBe("ok");
    expect(check.message).toContain("is not under S3_PUBLIC_URL (HTTP 404)");
    // What the keys cannot see: the private bucket's own public access.
    expect(check.details?.[0]).toContain("R2 → shop-dev-private → Settings → Public access");
  });

  it("is an error when either serves it", () => {
    expect(r2PrivateCheck({ ...base, api: answer(200), publicDomain: answer(404) }).level).toBe(
      "error",
    );
    const served = r2PrivateCheck({ ...base, api: answer(403), publicDomain: answer(200) });
    expect(served.level).toBe("error");
    expect(served.message).toContain("customers' exports are public");
  });

  it("checks a bucket with no file yet by a key that does not exist", () => {
    const check = r2PrivateCheck({
      ...base,
      key: undefined,
      api: answer(401),
      publicDomain: undefined,
    });
    expect(check.level).toBe("ok");
    expect(check.message).toContain("no private file yet");
    expect(
      r2PrivateCheck({ ...base, key: undefined, api: answer(404), publicDomain: undefined }).level,
    ).toBe("warn");
  });
});

describe("firstKey", () => {
  it("reads the first key of a listing", () => {
    expect(
      firstKey(
        answer(
          200,
          "<ListBucketResult><Contents><Key>private/a&amp;b.csv</Key></Contents></ListBucketResult>",
        ),
      ),
    ).toBe("private/a&b.csv");
    expect(firstKey(answer(200, "<ListBucketResult></ListBucketResult>"))).toBeUndefined();
    expect(firstKey(answer(403, "<Key>x</Key>"))).toBeUndefined();
  });
});
