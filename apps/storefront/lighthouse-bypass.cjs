// M7 D136 (3), D150 (T113): Lighthouse CI's `puppeteerScript` for a protected Vercel deployment.
// Before Lighthouse opens a page, this makes ONE request to that page's own origin with
// `x-vercel-protection-bypass` (the project's automation bypass secret) and
// `x-vercel-set-bypass-cookie: true`, so Vercel answers with its bypass cookie, and Lighthouse
// (`disableStorageReset` in `lighthouserc.cjs`) then loads the page with that cookie. The secret
// is in no other request: the request is for `/robots.txt` (text, nothing else to load), every
// other request the tab would make is refused, and the secret goes only to a `*.vercel.app` origin
// (or one named in `LHCI_BYPASS_HOSTS`, comma-separated), so a dispatch with another address
// sends it nowhere. The cookie is set once per origin for the whole run.
"use strict";

const done = new Set();

/** Whether the secret may go to `hostname`: a Vercel deployment, or a host named for it. */
function trusted(hostname) {
  const named = (process.env.LHCI_BYPASS_HOSTS ?? "")
    .split(",")
    .map((each) => each.trim().toLowerCase())
    .filter((each) => each !== "");
  const host = hostname.toLowerCase();
  return host.endsWith(".vercel.app") || named.includes(host);
}

/** @param {import('puppeteer-core').Browser} browser @param {{ url: string }} context */
module.exports = async (browser, context) => {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";
  const { origin, hostname } = new URL(context.url);
  if (secret === "" || done.has(origin)) return;
  if (!trusted(hostname)) {
    console.log(`lighthouse-bypass: ${hostname} is not a Vercel deployment; no bypass sent.`);
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
