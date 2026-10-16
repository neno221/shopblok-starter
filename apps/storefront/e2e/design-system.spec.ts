import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { viewportWidths } from "../src/design-system/viewport-widths";
import { collectConsole, judgeConsole, type FailedRequest, type Message } from "./support/console";

// T24 (D32, D34): every atom's frame, in two locales and at three widths, against `next start`
// built with DESIGN_SYSTEM_ENABLED=true (the `design-system` project; CI job `design-system`;
// SETUP.md, "DS checks (T24)"). One cell is one test, `atoms/price · el · 375`; each checks axe,
// overflow, the 44 px size of controls, the console (the rules of support/console.ts) and attaches a
// screenshot of the whole frame. The checks are soft, so a cell reports every check that failed.
//
// The widths are the viewport tokens the DS's own switcher uses (375, 768, 1440). D34 names `en`
// and `el`, so it is those two and not the four locales of the page: `el` is the one with the other
// script and the longer words.
//
// The atoms are the manifest's `atoms` group, as the build under test lists it: the DS overview
// links every entry of the manifest, and the suite reads those links. (The manifest's own module
// is React components, which Playwright's loader cannot import: `next/image` does not resolve
// outside Next.) With the flag off the overview is a 404 and there is nothing to list: the suite is
// then one test that says so, and stops there.

const checkedLocales = ["en", "el"] as const;
const widths = viewportWidths();

// The tags of D34 / T24 step 1.
const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// The size D32 asks of an interactive element, in CSS px.
const MIN_SIZE = 44;

// The config's default (`baseURL`), which a spec cannot read while it is being collected.
const base = process.env["E2E_BASE_URL"] ?? "http://localhost:8000";

/** The ids of the atoms (`atoms/price`), or why there are none. */
async function listAtoms(): Promise<{ ids: string[] } | { problem: string }> {
  const url = `${base}/design-system/en`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    return { problem: `${url} did not answer (${String(error)}): start \`next start\` first.` };
  }
  if (response.status !== 200) {
    return {
      problem:
        `${url} answered ${response.status}, not 200: this build lacks DESIGN_SYSTEM_ENABLED=true ` +
        "(the DS routes are 404 without it, D33). Build with `DESIGN_SYSTEM_ENABLED=true next build` and start that build.",
    };
  }
  const html = await response.text();
  const ids = [
    ...new Set(
      [...html.matchAll(/href="\/design-system\/en\/(atoms\/[a-z0-9-]+)"/g)].map((m) => m[1]!),
    ),
  ];
  return ids.length > 0 ? { ids } : { problem: `${url} links no atom: the manifest has no atoms.` };
}

const listed = await listAtoms();

const framePath = (locale: string, id: string) => `/design-system/${locale}/frame/${id}`;

if ("problem" in listed) {
  test("the build serves the design system", () => {
    throw new Error(listed.problem);
  });
}

type Finding = { selector: string; detail: string };

/** Elements whose own box (or whose hit area) is smaller than 44 × 44 (D32). Runs in the page. */
async function undersizedControls(page: Page, min: number): Promise<Finding[]> {
  return page.evaluate((minimum) => {
    const controlRoles = [
      "button",
      "checkbox",
      "radio",
      "switch",
      "slider",
      "spinbutton",
      "combobox",
    ];
    const selector = [
      "button",
      "a[href]",
      "input",
      "select",
      "textarea",
      ...controlRoles.map((role) => `[role="${role}"]`),
    ].join(",");

    const describe = (el: Element) => {
      const parts = [el.tagName.toLowerCase()];
      const role = el.getAttribute("role");
      if (role) parts.push(`[role=${role}]`);
      const slot = el.getAttribute("data-slot");
      if (slot) parts.push(`[data-slot=${slot}]`);
      const label = (el.getAttribute("aria-label") ?? el.textContent ?? "")
        .trim()
        .replace(/\s+/g, " ");
      if (label) parts.push(`"${label.slice(0, 40)}"`);
      return parts.join("");
    };

    const hidden = (el: Element) => {
      for (let node: Element | null = el; node; node = node.parentElement) {
        if (node.getAttribute("aria-hidden") === "true") return true;
        const style = getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden") return true;
      }
      return el.getClientRects().length === 0;
    };

    // A link inside running text: displayed inline, with text of its own parent around it.
    const inlineInText = (el: Element) => {
      if (el.tagName !== "A") return false;
      if (getComputedStyle(el).display !== "inline") return false;
      const parent = el.parentElement;
      if (!parent) return false;
      return [...parent.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "",
      );
    };

    type Box = { left: number; top: number; right: number; bottom: number };
    const boxOf = (rect: DOMRect): Box => ({
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
    });
    const size = (box: Box) => ({ w: box.right - box.left, h: box.bottom - box.top });

    // The element's box and its `::after`'s, when that is an absolutely positioned hit area.
    const hitArea = (el: Element): Box => {
      const box = boxOf(el.getBoundingClientRect());
      const after = getComputedStyle(el, "::after");
      if (after.content === "none" || after.position !== "absolute") return box;
      const style = getComputedStyle(el);
      const padLeft = box.left + parseFloat(style.borderLeftWidth);
      const padTop = box.top + parseFloat(style.borderTopWidth);
      const left = padLeft + parseFloat(after.left);
      const top = padTop + parseFloat(after.top);
      const width = parseFloat(after.width);
      const height = parseFloat(after.height);
      if ([left, top, width, height].some(Number.isNaN)) return box;
      return {
        left: Math.min(box.left, left),
        top: Math.min(box.top, top),
        right: Math.max(box.right, left + width),
        bottom: Math.max(box.bottom, top + height),
      };
    };

    const findings: { selector: string; detail: string }[] = [];
    for (const el of document.querySelectorAll(selector)) {
      if (hidden(el) || inlineInText(el)) continue;
      const own = el.getBoundingClientRect();
      // Base UI's hidden inputs and their like: 1 × 1 px, there for forms and not for people.
      if (own.width <= 1 && own.height <= 1) continue;
      const candidates: { name: string; box: Box }[] = [{ name: "its hit area", box: hitArea(el) }];
      const role = el.getAttribute("role");
      const isToggle =
        (el instanceof HTMLInputElement && ["checkbox", "radio"].includes(el.type)) ||
        role === "checkbox" ||
        role === "radio" ||
        role === "switch";
      if (isToggle) {
        const label =
          el.closest("label") ??
          (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null);
        if (label)
          candidates.push({ name: "its label", box: boxOf(label.getBoundingClientRect()) });
      }
      const ok = candidates.some(({ box }) => {
        const { w, h } = size(box);
        return w >= minimum - 0.01 && h >= minimum - 0.01;
      });
      if (!ok) {
        const best = candidates.map(({ name, box }) => {
          const { w, h } = size(box);
          return `${name} ${w.toFixed(1)} × ${h.toFixed(1)}`;
        });
        findings.push({ selector: describe(el), detail: best.join("; ") });
      }
    }
    return findings;
  }, min);
}

/** Elements that hide or clip their overflow and have more content than box (D34). Runs in the page. */
async function clippedElements(page: Page): Promise<Finding[]> {
  return page.evaluate(() => {
    const findings: { selector: string; detail: string }[] = [];
    const clips = (value: string) => value === "hidden" || value === "clip";
    for (const el of document.body.querySelectorAll("*")) {
      const style = getComputedStyle(el);
      if (!clips(style.overflowX)) continue;
      if (el.scrollWidth <= el.clientWidth) continue;
      if (el.closest("[data-truncate]")) continue;
      // Visually hidden text is clipped on purpose: `sr-only`, and Base UI's own (a 1 px box with
      // `clip-path`) for its live regions and hidden inputs.
      if (el.closest(".sr-only") || (el.clientWidth <= 1 && el.clientHeight <= 1)) continue;
      // A clip that holds no text loses no words: the Rating's mask that shows a part of a star.
      // An input's value is text, whatever its `textContent`.
      if (!(el instanceof HTMLInputElement) && (el.textContent ?? "").trim() === "") continue;
      const slot = el.getAttribute("data-slot");
      findings.push({
        selector: `${el.tagName.toLowerCase()}${slot ? `[data-slot=${slot}]` : ""}${
          typeof el.className === "string" && el.className
            ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
            : ""
        }`,
        detail: `scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}; text "${(el.textContent ?? "").trim().slice(0, 40)}"`,
      });
    }
    return findings;
  });
}

/** One line per finding; the same finding in several states of the frame is said once, with its count. */
const lines = (findings: Finding[]) => {
  const counts = new Map<string, number>();
  for (const f of findings) {
    const line = `${f.selector}: ${f.detail}`;
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  return [...counts].map(([line, n]) => (n > 1 ? `${line} (× ${n})` : line));
};

for (const id of "ids" in listed ? listed.ids : []) {
  for (const locale of checkedLocales) {
    for (const width of widths) {
      test(`${id} · ${locale} · ${width}`, async ({ page, baseURL }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        const consoleMessages: Message[] = [];
        const failedRequests: FailedRequest[] = [];
        collectConsole(page, consoleMessages, failedRequests);

        const response = await page.goto(framePath(locale, id), { waitUntil: "load" });
        expect(response?.status(), `${framePath(locale, id)} answers 200`).toBe(200);
        await page.waitForLoadState("networkidle");
        // Fonts change a box's size, so they are in before anything is measured.
        await page.evaluate(() => document.fonts.ready.then(() => undefined));

        // First, so that a cell that fails has its picture.
        await testInfo.attach(`${id.replace("/", "-")}-${locale}-${width}.png`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: "image/png",
        });

        const axe = await new AxeBuilder({ page }).withTags(axeTags).analyze();
        expect
          .soft(
            axe.violations.map(
              (v) =>
                `${v.id} (${v.impact}): ${v.help}\n` +
                v.nodes
                  .map(
                    (n) =>
                      `    ${n.target.join(" ")}\n      ${n.failureSummary?.replace(/\n/g, "\n      ")}`,
                  )
                  .join("\n") +
                `\n    ${v.helpUrl}`,
            ),
            "axe violations",
          )
          .toEqual([]);

        const horizontal = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        expect
          .soft(
            horizontal.scrollWidth,
            `the page is wider than the viewport (scrollWidth ${horizontal.scrollWidth}, innerWidth ${horizontal.innerWidth})`,
          )
          .toBeLessThanOrEqual(horizontal.innerWidth);
        expect
          .soft(lines(await clippedElements(page)), "elements clip content without data-truncate")
          .toEqual([]);

        expect
          .soft(
            lines(await undersizedControls(page, MIN_SIZE)),
            `controls smaller than ${MIN_SIZE} × ${MIN_SIZE} (D32)`,
          )
          .toEqual([]);

        const { local, summary } = judgeConsole(consoleMessages, failedRequests, baseURL);
        expect
          .soft(
            local.map((r) => `${r.url} ${r.error}`),
            "failed requests to this server",
          )
          .toEqual([]);
        expect.soft(summary, "console errors and warnings").toEqual([]);
      });
    }
  }
}
