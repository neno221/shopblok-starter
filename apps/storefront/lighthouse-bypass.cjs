// M7 D136 (3), D150 (T113): Lighthouse CI's `puppeteerScript` for a protected Vercel deployment.
// Before Lighthouse opens a page, this makes ONE request to that page's own origin with
// `x-vercel-protection-bypass` (the project's automation bypass secret) and
// `x-vercel-set-bypass-cookie: true`, so Vercel answers with its bypass cookie, which Lighthouse's
// own reset between runs keeps (it clears the cache, never cookies). The secret is in no other
// request: the request is for `/robots.txt` (text, nothing else to load) and every other request
// the tab would make is refused. It goes only to this project's own deployments (PR 157 review,
// item 4): a host named in `LHCI_BYPASS_HOSTS` (comma-separated; CI names the host of the
// deployment Vercel reported) or one that matches `LHCI_BYPASS_PATTERN` whole (a regular
// expression, such as this project's preview addresses); any other host, another Vercel
// customer's `*.vercel.app` included, is sent nothing. The cookie is set once per origin for the
// whole run.
"use strict";

const done = new Set();

/** Whether the secret may go to `hostname`: a host named for it, or one its pattern matches whole. */
function trusted(hostname) {
  const host = hostname.toLowerCase();
  const named = (process.env.LHCI_BYPASS_HOSTS ?? "")
    .split(",")
    .map((each) => each.trim().toLowerCase())
    .filter((each) => each !== "");
  if (named.includes(host)) return true;
  const pattern = (process.env.LHCI_BYPASS_PATTERN ?? "").trim();
  return pattern !== "" && new RegExp(`^(?:${pattern})$`, "i").test(host);
}

/** @param {import('puppeteer-core').Browser} browser @param {{ url: string }} context */
module.exports = async (browser, context) => {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";
  const { origin, hostname } = new URL(context.url);
  if (secret === "" || done.has(origin)) return;
  if (!trusted(hostname)) {
    console.log(
      `lighthouse-bypass: ${hostname} is not named in LHCI_BYPASS_HOSTS or LHCI_BYPASS_PATTERN; no bypass sent.`,
    );
    done.add(origin);
    return;
  }
  const page = await browser.newPage();
  try {
    const target = `${origin}/robots.txt`;
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.url() !== target) return void request.abort();
      void request.continue({
        headers: {
          ...request.headers(),
          "x-vercel-protection-bypass": secret,
          "x-vercel-set-bypass-cookie": "true",
        },
      });
    });
    const response = await page.goto(target, { waitUntil: "load" });
    const cookies = (await browser.cookies()).filter((cookie) =>
      `.${hostname}`.endsWith(`.${cookie.domain.replace(/^\./, "")}`),
    );
    if ((response?.status() ?? 0) >= 400 || cookies.length === 0) {
      throw new Error(
        `lighthouse-bypass: ${origin} answered ${response?.status() ?? "nothing"} and set no bypass cookie; is VERCEL_AUTOMATION_BYPASS_SECRET this project's?`,
      );
    }
    console.log(`lighthouse-bypass: ${origin} set its bypass cookie.`);
    done.add(origin);
  } finally {
    await page.close();
  }
};
