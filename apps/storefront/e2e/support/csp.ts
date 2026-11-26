// M7 D138, D140 (T106): the CSP fixture. Every suite that renders the shop or the DS imports `test`
// and `expect` from here (or from `third-party.ts`, which builds on this one), so a test fails when
// any page it opened reports a `securitypolicyviolation`: an enforced block and a report-only one
// alike (some browsers print nothing for the second). It watches the test's own context and every
// context the test opens itself, as `third-party.ts` does, and names each violation by directive,
// blocked URL (without its query) and page path.
//
// **Recording mode** (`CSP_RECORD=<file>`, the inventory of T106's step 1): the fixture also writes,
// per test, every request the shop's own documents make and every frame they open, one JSON line
// each: the route type (`routeType`), the request's origin, Playwright's resource type and whether
// it was a frame. `csp-inventory.ts` turns the file into the table SETUP.md shows. Recording never
// fails a test by itself; the violations still do.
import { appendFileSync } from "node:fs";
import { expect, test as base, type BrowserContext, type Request } from "@playwright/test";
import { routeType, type RecordedRequest, type Violation } from "./csp-inventory";

export { routeType } from "./csp-inventory";

const BINDING = "__shopblokCspViolation";

// Runs in every document before its own scripts. `securitypolicyviolation` bubbles to the document
// from the element that broke the policy; the report-only disposition fires it too.
const LISTENER = `(() => {
  const send = globalThis[${JSON.stringify(BINDING)}];
  if (typeof send !== "function") return;
  document.addEventListener("securitypolicyviolation", (event) => {
    send({
      directive: event.effectiveDirective || event.violatedDirective,
      blocked: event.blockedURI,
      source: event.sourceFile,
      line: event.lineNumber,
      disposition: event.disposition,
      page: location.href,
      sample: event.sample,
    });
  }, true);
})();`;

const withoutQuery = (url: string): string => url.replace(/[?#].*$/, "");

function describeViolation(v: Violation): string {
  const where = (() => {
    try {
      return new URL(v.page).pathname;
    } catch {
      return v.page;
    }
  })();
  const blocked = withoutQuery(v.blocked || "(nothing)");
  const source = v.source ? ` from ${withoutQuery(v.source)}:${v.line ?? 0}` : "";
  const sample = v.sample ? ` ("${v.sample}")` : "";
  return `${v.disposition} ${v.directive} blocked ${blocked} on ${where}${source}${sample}`;
}

function recorded(request: Request, site: string): RecordedRequest | undefined {
  let frame;
  try {
    frame = request.frame();
  } catch {
    return undefined;
  }
  const isFrame = request.isNavigationRequest() && frame.parentFrame() !== null;
  // A frame's navigation is the parent's `frame-src`; anything else is the document's own.
  const document = isFrame ? frame.parentFrame()?.url() : frame.url();
  if (document === undefined) return undefined;
  let docUrl: URL;
  let target: URL;
  try {
    docUrl = new URL(document);
    target = new URL(request.url());
  } catch {
    return undefined;
  }
  // Only the shop's own documents: a request inside Stripe's frame is under Stripe's policy.
  if (docUrl.origin !== new URL(site).origin) return undefined;
  if (request.isNavigationRequest() && !isFrame) return undefined;
  return {
    route: routeType(docUrl.pathname),
    origin:
      target.protocol === "data:" || target.protocol === "blob:" ? target.protocol : target.origin,
    type: request.resourceType(),
    frame: isFrame,
  };
}

// The fixture's second argument is Playwright's `use`, named `run` here (React's hooks rule).
// `expectedCspViolations` (M7 T107, a mutation test's own): each entry is a piece of a violation's
// description (`describeViolation`) that must be seen, so a test that provokes a block asserts it
// happened instead of passing on any failure (`test.fail`). Every other violation still fails.
export const test = base.extend<{ noCspViolations: void; expectedCspViolations: string[] }>({
  expectedCspViolations: [[], { option: true }],
  noCspViolations: [
    async ({ context, browser, baseURL, expectedCspViolations }, run, testInfo) => {
      const site = baseURL ?? "http://localhost:8000";
      const violations: Violation[] = [];
      const requests: RecordedRequest[] = [];
      const recordTo = process.env["CSP_RECORD"]?.trim() || undefined;
      const watched = new WeakSet<BrowserContext>();
      const watch = async (target: BrowserContext) => {
        if (watched.has(target)) return;
        watched.add(target);
        await target.exposeBinding(BINDING, (_source, violation: Violation) => {
          // Only the shop's own documents: a frame on another origin (Stripe's 3-D Secure page on
          // `testmode-acs.stripe.com`) runs under its own server's policy, not ours, and its
          // violations are that server's (T106's keyed run found Stripe's ACS blocking a `data:`
          // image of its own).
          if (originOf(violation.page) === new URL(site).origin) violations.push(violation);
        });
        await target.addInitScript({ content: LISTENER });
        if (recordTo !== undefined) {
          target.on("request", (request) => {
            const entry = recorded(request, site);
            if (entry !== undefined) requests.push(entry);
          });
        }
      };
      await watch(context);
      const newContext = browser.newContext.bind(browser);
      browser.newContext = async (...args: Parameters<typeof browser.newContext>) => {
        const opened = await newContext(...args);
        await watch(opened);
        return opened;
      };
      try {
        await run();
      } finally {
        Reflect.deleteProperty(browser, "newContext");
        if (recordTo !== undefined && (requests.length > 0 || violations.length > 0)) {
          const spec = testInfo.file.replace(/^.*\/e2e\//, "");
          const lines = [
            ...requests.map((r) => JSON.stringify({ spec, ...r })),
            ...violations.map((v) =>
              JSON.stringify({
                spec,
                violation: describeViolation(v),
                route: routeType(pathOf(v.page)),
              }),
            ),
          ];
          appendFileSync(recordTo, `${lines.join("\n")}\n`);
        }
      }
      const described = violations.map(describeViolation);
      for (const expected of expectedCspViolations) {
        expect(
          described.some((v) => v.includes(expected)),
          `the expected violation "${expected}" was not seen (seen: ${JSON.stringify(described)})`,
        ).toBe(true);
      }
      expect(
        described.filter((v) => !expectedCspViolations.some((expected) => v.includes(expected))),
        "a page broke the Content Security Policy (M7 D138): add the host to lib/security/csp.ts with its source, or remove what loads it",
      ).toEqual([]);
    },
    { auto: true },
  ],
});

function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "/";
  }
}

export { expect };
