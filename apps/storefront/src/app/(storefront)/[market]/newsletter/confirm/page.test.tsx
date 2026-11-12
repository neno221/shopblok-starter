import { catalogs } from "@shopblok/i18n";
import { prerender } from "react-dom/static";
import { beforeEach, expect, it, vi } from "vitest";

// T99 (D122): the newsletter's confirmation page. Opening the link (a GET: a person, a mail
// scanner, a prefetch) shows the address and the "Confirm" form and writes nothing; only the form's
// POST (`confirmNewsletter`, its own test in `lib/newsletter`) uses the token.

vi.stubEnv("PAYLOAD_SECRET", "a-test-secret-of-the-payload-kind");

const payload = vi.hoisted(() => ({
  used: new Set<string>(),
  count: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findByID: vi.fn(),
  sendEmail: vi.fn(),
}));
vi.mock("next/root-params", () => ({ market: async () => "en-us" }));
vi.mock("../../../../../lib/cms/payload", () => ({ getPayloadClient: async () => payload }));
vi.mock("../../../../../lib/actions/newsletter", () => ({ confirmNewsletter: vi.fn() }));
vi.mock("../../../../../lib/auth-page", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  authPageContext: async () => ({
    market: { key: "en-us", htmlLang: "en-US" },
    context: { url: (path: string) => `/us${path === "/" ? "" : path}` },
    messages: catalogs.en,
  }),
}));

const { signToken, tokenKey } = await import("../../../../../lib/newsletter/token");
const { default: NewsletterConfirmPage } = await import("./page");

const copy = catalogs.en.templates.newsletterConfirm;

beforeEach(() => {
  payload.used.clear();
  payload.count
    .mockReset()
    .mockImplementation(async ({ where }: { where: { tokenId: { equals: string } } }) => ({
      totalDocs: payload.used.has(where.tokenId.equals) ? 1 : 0,
    }));
  for (const fn of [payload.create, payload.update, payload.delete, payload.sendEmail])
    fn.mockReset();
});

async function open(query: Record<string, string>): Promise<string> {
  const page = await NewsletterConfirmPage({ searchParams: Promise.resolve(query) });
  const { prelude } = await prerender(page);
  return (await new Response(prelude).text()).replaceAll("&#x27;", "'");
}

const link = () =>
  signToken({ email: "ana@example.com", form: 3, market: "en-us", language: "en" }, tokenKey());

it("shows the address and a Confirm form posting the token, and a GET confirms nothing", async () => {
  const { token } = link();
  const html = await open({ token });
  expect(html).toContain('data-screen="confirm"');
  expect(html).toContain(copy.title);
  expect(html).toContain("Confirm that ana@example.com should receive our newsletter.");
  expect(html).toContain(`name="token" value="${token}"`);
  expect(html).toContain(`>${copy.submit}</button>`);
  // Opened twice, as a scanner and then a person would: still the form, and nothing written.
  expect(await open({ token })).toContain('data-screen="confirm"');
  expect(payload.create).not.toHaveBeenCalled();
  expect(payload.update).not.toHaveBeenCalled();
  expect(payload.delete).not.toHaveBeenCalled();
  expect(payload.sendEmail).not.toHaveBeenCalled();
});

it("says a used link is already confirmed, and a broken or missing one no longer works", async () => {
  const { token, claims } = link();
  payload.used.add(claims.id);
  expect(await open({ token })).toContain(copy.used);
  expect(await open({ token: "nonsense" })).toContain(copy.expired);
  expect(await open({})).toContain(copy.expiredTitle);
});

it("draws the POST's outcome, and after a failure the form again with the error", async () => {
  expect(await open({ state: "done" })).toContain(copy.done);
  expect(await open({ state: "used" })).toContain(copy.usedTitle);
  const { token } = link();
  const failed = await open({ state: "failed", token });
  expect(failed).toContain(copy.failed);
  expect(failed).toContain(`name="token" value="${token}"`);
});
