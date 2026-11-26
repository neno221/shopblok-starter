import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { signInToAdmin } from "../support/admin-ui";
import { appEnv } from "../support/app-env";
import {
  doctorOnline,
  integration,
  missingKeys,
  skipWithoutKeys,
} from "../support/integration-keys";
import { medusaAdminApi, medusaAdminToken, medusaUrl } from "../support/medusa-admin";
import { api } from "../support/payload-rest";
import { adminToken } from "../support/server";

// M6 D127, D131 (T95): Cloudflare R2, live. With the S3_* keys in both apps (and
// S3_PRIVATE_BUCKET in the backend), Payload's media and Medusa's files are on R2: a picture
// uploaded in Payload's admin goes from the browser straight to the public bucket (`clientUploads`),
// gets its sizes, and is drawn on a page from `S3_PUBLIC_URL`; a picture uploaded through Medusa
// Admin's upload route is public there too; Medusa Admin's product import may PUT its CSV to the
// private bucket from Medusa Admin's origin; a product export lands in the private bucket, its
// presigned link downloads it, and neither its plain URL on the public domain nor an unsigned read
// on the S3 API serves it. Everything it makes is deleted after. Without the keys it is skipped,
// naming them; it prints no key. The buckets' CORS rules are set once with `pnpm r2:cors` and an
// admin token (SETUP "Turning on R2"): the apps' Object Read & Write token cannot set them, so the
// browser's PUT here is what shows the public bucket's rule.

skipWithoutKeys(test, "r2");

const stamp = Date.now().toString(36);
const publicUrl = () => appEnv("storefront", "S3_PUBLIC_URL").trim().replace(/\/+$/, "");

/** A picture large enough for every size `media` makes (the largest is 1920 wide). */
const picture = () =>
  sharp({ create: { width: 2000, height: 1200, channels: 3, background: "#c8783c" } })
    .png()
    .toBuffer();

type MediaDoc = {
  id: number;
  url: string;
  filename: string;
  prefix?: string | null;
  sizes?: Record<string, { url?: string | null; width?: number | null } | undefined>;
};

test.describe("R2 (T95)", () => {
  test.describe.configure({ mode: "serial" });
  let token = "";
  const made: { media: number[]; pages: number[]; medusaFiles: string[] } = {
    media: [],
    pages: [],
    medusaFiles: [],
  };

  test.beforeAll(async () => {
    // `skipWithoutKeys` skips in `beforeEach`, which runs after this: without the keys, nothing here.
    if (missingKeys(integration("r2")).length > 0) return;
    token = await adminToken();
  });

  test.afterAll(async () => {
    for (const id of made.pages)
      await api(token, "DELETE", `/api/pages/${id}`).catch(() => undefined);
    for (const id of made.media)
      await api(token, "DELETE", `/api/media/${id}`).catch(() => undefined);
    if (made.medusaFiles.length > 0) {
      const medusa = medusaUrl();
      const admin = await medusaAdminToken(medusa);
      for (const id of made.medusaFiles)
        await fetch(`${medusa}/admin/uploads/${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: { authorization: `Bearer ${admin}` },
        }).catch(() => undefined);
    }
  });

  test("doctor --online finds both buckets and the private files refused, and no R2 error", async () => {
    const report = await doctorOnline();
    const r2 = report.checks.filter((check) => check.id.startsWith("r2-"));
    expect(
      r2.map((check) => `${check.id}: ${check.level}: ${check.message}`),
      "doctor's R2 checks",
    ).toEqual(expect.arrayContaining([expect.stringMatching(/^r2-bucket-public: ok/)]));
    for (const id of ["r2-bucket-private", "r2-private"])
      expect(r2.find((check) => check.id === id)?.level, id).toBe("ok");
    // The CORS checks are a warning with the apps' Object Read & Write token (it may not read bucket
    // settings), and must never be an error.
    expect(r2.filter((check) => check.level === "error")).toEqual([]);
  });

  test("a picture uploaded in Payload's admin goes to R2, with its sizes, and is drawn from S3_PUBLIC_URL", async ({
    page,
  }) => {
    await signInToAdmin(page);
    await page.goto("/admin/collections/media/create?locale=en");
    const signed = page.waitForResponse((response) =>
      response.url().includes("/api/storage-s3-generate-signed-url"),
    );
    // The browser's own PUT to R2 (a presigned URL on the S3 API's host).
    const direct = page.waitForRequest(
      (request) =>
        request.method() === "PUT" && !request.url().startsWith(new URL(page.url()).origin),
    );
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({ name: `r2-${stamp}.png`, mimeType: "image/png", buffer: await picture() });
    await page.locator('input[name="alt"]:visible').fill("An R2 test picture");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    expect((await signed).status(), "the signed upload URL").toBe(200);
    const put = await (await direct).response();
    expect(put?.status(), "the browser's PUT to R2").toBe(200);
    await page.waitForURL(/\/admin\/collections\/media\/(\d+)/);
    const id = Number(/\/media\/(\d+)/.exec(page.url())?.[1]);
    expect(id).toBeGreaterThan(0);
    made.media.push(id);

    const doc = await api<MediaDoc>(token, "GET", `/api/media/${id}?locale=en&depth=0`);
    const base = `${publicUrl()}/media/`;
    expect(doc.prefix).toBe("media");
    expect(doc.url.startsWith(base), `${doc.url} is on S3_PUBLIC_URL`).toBe(true);
    // D127 step 2: the sizes are made from the file Payload reads back from R2.
    for (const size of ["thumb", "card", "hero", "og"]) {
      const url = doc.sizes?.[size]?.url ?? "";
      expect(url.startsWith(base), `${size}: ${url}`).toBe(true);
      const file = await fetch(url);
      expect(file.status, `${size} is served`).toBe(200);
      expect(file.headers.get("content-type"), size).toMatch(/^image\//);
    }

    const created = await api<{ doc: { id: number } }>(token, "POST", "/api/pages?locale=en", {
      title: `R2 ${stamp}`,
      slug: `e2e-r2-${stamp}`,
      layout: [
        {
          blockType: "mediaWithText",
          media: id,
          imageSide: "end",
          heading: `Stored on R2 ${stamp}`,
        },
      ],
      _status: "published",
    });
    made.pages.push(created.doc.id);
    await drawnFromR2(page, `/us/e2e-cms/e2e-r2-${stamp}`);
  });

  test("a picture uploaded through Medusa Admin is public on S3_PUBLIC_URL", async () => {
    const medusa = medusaUrl();
    const admin = await medusaAdminToken(medusa);
    const form = new FormData();
    form.append(
      "files",
      new Blob([new Uint8Array(await picture())], { type: "image/png" }),
      `r2-medusa-${stamp}.png`,
    );
    const answer = await fetch(`${medusa}/admin/uploads`, {
      method: "POST",
      headers: { authorization: `Bearer ${admin}` },
      body: form,
    });
    expect(answer.status, await answer.clone().text()).toBe(200);
    const { files } = (await answer.json()) as { files: { id: string; url: string }[] };
    const file = files[0]!;
    made.medusaFiles.push(file.id);
    expect(file.id).toMatch(new RegExp(`^medusa/r2-medusa-${stamp}-[0-9A-Z]{26}\\.png$`));
    expect(file.url).toBe(`${publicUrl()}/${file.id}`);
    const served = await fetch(file.url);
    expect(served.status, "served without a signature").toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");
  });

  test("Medusa Admin's product import may PUT its CSV to the private bucket from Medusa Admin's origin", async () => {
    const medusa = medusaUrl();
    const admin = await medusaAdminToken(medusa);
    const csv = "Product Handle,Product Title\n";
    // What `@medusajs/js-sdk`'s `createImport` asks for (the route's default access is private).
    const presigned = await medusaAdminApi<{ url: string; filename: string }>(
      medusa,
      admin,
      "POST",
      "/admin/uploads/presigned-urls",
      { originalname: `r2-import-${stamp}.csv`, mime_type: "text/csv", size: csv.length },
    );
    made.medusaFiles.push(presigned.filename);
    expect(presigned.filename).toMatch(/^private\//);
    const url = new URL(presigned.url);
    expect(url.pathname.split("/")[1], "the private bucket").toBe(
      appEnv("backend", "S3_PRIVATE_BUCKET").trim(),
    );
    const origin = new URL(medusa).origin;
    const preflight = await fetch(url, {
      method: "OPTIONS",
      headers: {
        origin,
        "access-control-request-method": "PUT",
        "access-control-request-headers": "content-type",
      },
    });
    expect(preflight.status, "the browser's preflight from Medusa Admin").toBeLessThan(300);
    expect(preflight.headers.get("access-control-allow-origin")).toBe(origin);
    const put = await fetch(url, {
      method: "PUT",
      headers: { origin, "content-type": "text/csv" },
      body: csv,
    });
    expect(put.status, "the CSV's PUT").toBe(200);
    expect(put.headers.get("access-control-allow-origin")).toBe(origin);
  });

  test("a product export lands in the private bucket: its presigned link downloads it, its plain URLs do not", async () => {
    const medusa = medusaUrl();
    const admin = await medusaAdminToken(medusa);
    const since = Date.now();
    await medusaAdminApi(medusa, admin, "POST", "/admin/products/export", {});

    // Medusa's export notifies the admin on `feed` with the file's presigned link.
    type Feed = {
      id: string;
      created_at: string;
      data?: { file?: { filename?: string; url?: string } };
    };
    let exported: { filename: string; url: string } | undefined;
    await expect
      .poll(
        async () => {
          const { notifications } = await medusaAdminApi<{ notifications: Feed[] }>(
            medusa,
            admin,
            "GET",
            "/admin/notifications?channel=feed&order=-created_at&limit=20&fields=id,created_at,data",
          );
          const found = notifications.find(
            (n) =>
              Date.parse(n.created_at) >= since - 5_000 &&
              /product-exports/.test(n.data?.file?.filename ?? "") &&
              typeof n.data?.file?.url === "string",
          );
          if (found) exported = found.data!.file as { filename: string; url: string };
          return exported !== undefined;
        },
        { timeout: 60_000, message: "the export's notification with its link" },
      )
      .toBe(true);

    const link = new URL(exported!.url);
    const [bucket, ...rest] = link.pathname.slice(1).split("/");
    const key = decodeURIComponent(rest.join("/"));
    made.medusaFiles.push(key);

    // Not served on the public domain, nor read without a signature on the S3 API (the mutation
    // that sends a private file to the public bucket fails here first).
    const onPublicDomain = await fetch(`${publicUrl()}/${rest.join("/")}`);
    expect(onPublicDomain.status, "the export on S3_PUBLIC_URL").toBe(404);
    const unsigned = await fetch(`${link.origin}${link.pathname}`);
    expect([400, 401, 403], `an unsigned read on the S3 API (HTTP ${unsigned.status})`).toContain(
      unsigned.status,
    );

    const download = await fetch(link);
    expect(download.status, "the presigned link downloads the export").toBe(200);
    expect(await download.text()).toContain("Product Id");
    const endpoint = new URL(appEnv("backend", "S3_ENDPOINT").trim());
    expect(link.host, "the link is on the S3 API, not the public domain").toBe(endpoint.host);
    expect(bucket).toBe(appEnv("backend", "S3_PRIVATE_BUCKET").trim());
    expect(key).toMatch(/^private\/\d+-product-exports-[0-9A-Z]{26}\.csv$/);
    expect(link.searchParams.get("X-Amz-Signature")).toBeTruthy();
  });
});

/** The page draws the picture through `next/image` from `S3_PUBLIC_URL`, and it loads. */
async function drawnFromR2(page: Page, path: string): Promise<void> {
  await page.goto(path);
  const image = page.locator('main#main [data-slot="media-with-text-section"] img').first();
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), {
      message: "the picture loaded",
    })
    .toBe(true);
  const src = new URL((await image.getAttribute("src")) ?? "", page.url());
  // next/image's optimiser, fed the file on R2's domain (`images.remotePatterns`).
  expect(src.pathname).toBe("/_next/image");
  expect(src.searchParams.get("url")?.startsWith(`${publicUrl()}/media/`)).toBe(true);
}
