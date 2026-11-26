import { describe, expect, it } from "vitest";
import {
  IMPORT_UPLOAD_RULE,
  allowsUploadFrom,
  contentMd5,
  corsDashboardJson,
  corsXml,
  parseCorsArgs,
  parseCorsRules,
  s3Url,
  signS3,
  uriEncode,
  withAdminOrigins,
  type CorsRule,
} from "./s3.ts";

// AWS's own examples for Signature Version 4 on S3 ("Signature Calculations for the Authorization
// Header: Transferring Payload in a Single Chunk", S3 API Reference): the documented keys, the
// date and the signature each request must get.
const AWS = {
  endpoint: "https://examplebucket.s3.amazonaws.com",
  region: "us-east-1",
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
};
const MAY_24 = new Date("2013-05-24T00:00:00Z");
const signature = (headers: Record<string, string>) =>
  /Signature=([0-9a-f]{64})$/.exec(headers.authorization ?? "")?.[1];

describe("signS3", () => {
  it("signs AWS's GET Object example (a Range header)", () => {
    const headers = signS3({
      method: "GET",
      url: "https://examplebucket.s3.amazonaws.com/test.txt",
      keys: AWS,
      now: MAY_24,
      headers: { Range: "bytes=0-9" },
    });
    expect(signature(headers)).toBe(
      "f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
    );
    expect(headers.authorization).toContain(
      "Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date,",
    );
    expect(headers["x-amz-date"]).toBe("20130524T000000Z");
    expect(headers.host).toBeUndefined();
  });

  it("signs AWS's GET Bucket Lifecycle example (a query with no value)", () => {
    expect(
      signature(
        signS3({
          method: "GET",
          url: "https://examplebucket.s3.amazonaws.com/?lifecycle",
          keys: AWS,
          now: MAY_24,
        }),
      ),
    ).toBe("fea454ca298b7da1c68078a5d1bdbfbbe0d65c699e0f91ac7a200a0136783543");
  });

  it("signs AWS's Get Bucket (List Objects) example (the query sorted)", () => {
    expect(
      signature(
        signS3({
          method: "GET",
          url: "https://examplebucket.s3.amazonaws.com/?prefix=J&max-keys=2",
          keys: AWS,
          now: MAY_24,
        }),
      ),
    ).toBe("34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7");
  });

  it("signs a body by its hash, and `auto` for a blank region (R2)", () => {
    const headers = signS3({
      method: "PUT",
      url: "https://account.r2.cloudflarestorage.com/bucket?cors=",
      keys: { ...AWS, region: " " },
      now: MAY_24,
      body: "<CORSConfiguration/>",
    });
    expect(headers["x-amz-content-sha256"]).not.toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(headers.authorization).toContain("/20130524/auto/s3/aws4_request");
  });
});

describe("s3Url", () => {
  it("builds a path-style URL, each key segment encoded once", () => {
    expect(s3Url("https://a.r2.cloudflarestorage.com/", "shop", "private/a b(1).csv")).toBe(
      "https://a.r2.cloudflarestorage.com/shop/private/a%20b%281%29.csv",
    );
    expect(s3Url("https://a.example", "shop", "", { cors: "" })).toBe(
      "https://a.example/shop?cors",
    );
    expect(s3Url("https://a.example", "shop", "", { "list-type": "2", prefix: "private/" })).toBe(
      "https://a.example/shop?list-type=2&prefix=private%2F",
    );
    expect(uriEncode("a~b-c_d.e!")).toBe("a~b-c_d.e%21");
  });
});

describe("the CORS rules", () => {
  const font: CorsRule = {
    allowedOrigins: ["https://fonts.example"],
    allowedMethods: ["GET"],
    allowedHeaders: [],
    exposeHeaders: [],
  };

  it("reads back what it writes", () => {
    const rules = withAdminOrigins([font], ["https://shop.example"]).rules;
    expect(parseCorsRules(corsXml(rules))).toEqual(rules);
    expect(parseCorsRules("")).toEqual([]);
    expect(contentMd5("")).toBe("1B2M2Y8AsgTpgAmY7PhCfg==");
  });

  it("adds the admin's origin to one upload rule and keeps the others (idempotent)", () => {
    const first = withAdminOrigins([font], ["https://shop.example"]);
    expect(first.changed).toBe(true);
    expect(first.rules[0]).toEqual(font);
    expect(first.rules[1]).toMatchObject({
      allowedOrigins: ["https://shop.example"],
      allowedMethods: ["GET", "HEAD", "PUT"],
      allowedHeaders: ["*"],
      exposeHeaders: ["ETag"],
    });
    const again = withAdminOrigins(parseCorsRules(corsXml(first.rules)), ["https://shop.example"]);
    expect(again.changed).toBe(false);
    expect(again.rules).toEqual(first.rules);
    const more = withAdminOrigins(first.rules, ["http://localhost:8000"]);
    expect(more.changed).toBe(true);
    expect(more.origins).toEqual(["https://shop.example", "http://localhost:8000"]);
  });

  it("allows an upload only by a PUT rule for that origin, with the headers the upload sends", () => {
    const rules = withAdminOrigins([font], ["https://shop.example"]).rules;
    expect(allowsUploadFrom(rules, "https://shop.example")).toBe(true);
    expect(allowsUploadFrom(rules, "https://other.example")).toBe(false);
    expect(allowsUploadFrom([font], "https://fonts.example")).toBe(false);
    const narrow = { ...rules[1]!, allowedHeaders: ["Content-Type"] };
    expect(allowsUploadFrom([narrow], "https://shop.example")).toBe(false);
    expect(
      allowsUploadFrom(
        [{ ...narrow, allowedHeaders: ["content-type", "If-None-Match"] }],
        "https://shop.example",
      ),
    ).toBe(true);
  });
});

describe("Medusa Admin's import rule and the dashboard's JSON", () => {
  it("allows a PUT with the CSV's type only, and prints the rule as the dashboard takes it", () => {
    const { rules } = withAdminOrigins([], ["https://api.shop.example"], IMPORT_UPLOAD_RULE);
    expect(rules).toEqual([
      {
        allowedOrigins: ["https://api.shop.example"],
        allowedMethods: ["PUT"],
        allowedHeaders: ["content-type"],
        exposeHeaders: [],
        maxAgeSeconds: 3600,
      },
    ]);
    expect(allowsUploadFrom(rules, "https://api.shop.example", IMPORT_UPLOAD_RULE)).toBe(true);
    // Payload's uploads also send If-None-Match, which this rule does not allow.
    expect(allowsUploadFrom(rules, "https://api.shop.example")).toBe(false);
    expect(JSON.parse(corsDashboardJson(rules))).toEqual([
      {
        AllowedOrigins: ["https://api.shop.example"],
        AllowedMethods: ["PUT"],
        AllowedHeaders: ["content-type"],
        MaxAgeSeconds: 3600,
      },
    ]);
  });
});

describe("parseCorsArgs", () => {
  it("takes origins and --dry-run, and refuses anything else", () => {
    expect(parseCorsArgs([])).toEqual({ origins: [], dryRun: false, json: false });
    expect(parseCorsArgs(["--json"])).toEqual({ origins: [], dryRun: false, json: true });
    expect(
      parseCorsArgs([
        "--origin",
        "http://localhost:8000/admin",
        "--origin=https://a.example",
        "--dry-run",
      ]),
    ).toEqual({
      origins: ["http://localhost:8000", "https://a.example"],
      dryRun: true,
      json: false,
    });
    expect(parseCorsArgs(["--origin", "nope"])).toMatch(/needs a URL/);
    expect(parseCorsArgs(["--force"])).toMatch(/unknown argument/);
  });
});
