import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { commerceFixtures, fixtureNow } from "@shopblok/fixtures";
import { entries } from "@shopblok/registry";
import { interactions, type DsInteraction } from "../src/design-system/interactions";
import { viewportWidths } from "../src/design-system/viewport-widths";
import { collectConsole, judgeConsole, type FailedRequest, type Message } from "./support/console";

// T24 (D32, D34): every component entry's frame, in two locales and at three widths, against
// `next start` built with DESIGN_SYSTEM_ENABLED=true (the `design-system` project; CI job
// `design-system`; SETUP.md, "DS checks (T24)"). One cell is one test, `atoms/price · el · 375`;
// each checks axe, overflow, the 44 px size of controls, controls nested in a link or a button
// (T32), content that scrolls sideways in its box (T34), the console (the rules of support/console.ts) and attaches a screenshot of the whole
// frame. The checks are soft, so a cell reports every check that failed. After the cells: T31's
// overlay box, T33's interaction checks (D45: an overlay opened from the keyboard) and the bundle
// test (D49: no flag in a client chunk).
//
// The widths are the viewport tokens the DS's own switcher uses (375, 768, 1440). D34 names `en`
// and `el`, so it is those two and not the four locales of the page: `el` is the one with the other
// script and the longer words.
//
// The entries are the registry's (T29, D40), every one outside Foundations: a new molecule or
// organism gets its cells by being listed there. The registry is data with no React, so
// Playwright's loader imports it; the stories, which render, stay in the storefront. With the flag
// off the overview is a 404 and no frame exists: the suite is then one test that says so, and stops
// there.

const checkedLocales = ["en", "el"] as const;
const widths = viewportWidths();

// The tags of D34 / T24 step 1.
const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * axe on the page with D34's tags, without Base UI's focus guards (T34). A guard is an empty
 * `aria-hidden` span with `tabindex="0"` on each side of an open popup and of its portal, and it
 * hands focus on the moment it gets it (a React focus handler, which axe cannot see: its own
 * exemption reads the `onfocus` property). axe's `aria-hidden-focus` reports them as violations
 * unless it thinks a modal is open, which it decides from a visible `role="dialog"`: MarketSwitcher's
 * open states pass that way, SavedPaymentMethodCard's alert dialog (`role="alertdialog"`) does not.
 * Where focus really goes is the interaction checks' to test. Any other `aria-hidden` element that
 * can take focus is still reported.
 */
const axeScan = (page: Page) =>
  new AxeBuilder({ page }).withTags(axeTags).exclude("[data-base-ui-focus-guard]").analyze();

// The size D32 asks of an interactive element, in CSS px.
const MIN_SIZE = 44;

// The config's default (`baseURL`), which a spec cannot read while it is being collected.
const base = process.env["E2E_BASE_URL"] ?? "http://localhost:8000";

/** Why the server under test cannot be checked, or `undefined` when it serves the DS. */
async function problemWithServer(): Promise<string | undefined> {
  const url = `${base}/design-system/en`;
  let response: Response;
  try {
    // Collection runs outside any test's timeout: a server that accepts and never answers would
    // otherwise hold the run until the job's limit.
    response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  } catch (error) {
    return `${url} did not answer within 30 s (${String(error)}): start \`next start\` first.`;
  }
  if (response.status !== 200)
    return (
      `${url} answered ${response.status}, not 200: this build lacks DESIGN_SYSTEM_ENABLED=true ` +
      "(the DS routes are 404 without it, D33). Build with `DESIGN_SYSTEM_ENABLED=true next build` and start that build."
    );
  return undefined;
}

const problem = await problemWithServer();

// Every entry that renders a component: the atoms now, the molecules and organisms as M2 adds them.
const ids =
  problem === undefined
    ? entries.filter((entry) => entry.component !== undefined).map((entry) => entry.id)
    : [];

const framePath = (locale: string, id: string) => `/design-system/${locale}/frame/${id}`;

if (problem !== undefined) {
  test("the build serves the design system", () => {
    throw new Error(problem);
  });
} else if (ids.length === 0) {
  // The old overview scan failed on an empty list; the registry filter keeps that guarantee.
  test("the registry has entries that render a component", () => {
    throw new Error("No registry entry has a component, so the suite would check nothing.");
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

    // `visibility` is inherited and a descendant can set it back to `visible`, so only the
    // element's own computed value counts; `display: none` and `aria-hidden` hide the subtree.
    const hidden = (el: Element) => {
      if (getComputedStyle(el).visibility === "hidden") return true;
      for (let node: Element | null = el; node; node = node.parentElement) {
        if (node.getAttribute("aria-hidden") === "true") return true;
        if (getComputedStyle(node).display === "none") return true;
      }
      return el.getClientRects().length === 0;
    };

    // A link inside running text: displayed inline, with words of its own parent around it. A
    // separator alone ("Home / Shop", "Terms · Privacy") is not running text, so it needs a
    // letter or a digit.
    const inlineInText = (el: Element) => {
      if (el.tagName !== "A") return false;
      if (getComputedStyle(el).display !== "inline") return false;
      const parent = el.parentElement;
      if (!parent) return false;
      return [...parent.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && /[\p{L}\p{N}]/u.test(node.textContent ?? ""),
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

    // The element's box and its `::after`'s, when that is an absolutely positioned hit area. The
    // `::after`'s offsets are from its containing block, which is the element only when the
    // element is positioned; otherwise they would describe a box somewhere else.
    const hitArea = (el: Element): Box => {
      const box = boxOf(el.getBoundingClientRect());
      const after = getComputedStyle(el, "::after");
      if (after.content === "none" || after.position !== "absolute") return box;
      const style = getComputedStyle(el);
      if (style.position === "static") return box;
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

/**
 * Interactive elements inside a link or a button (T32): HTML's content model forbids them, and a
 * screen reader names the outer control by the inner one's text. axe's `nested-interactive` only
 * looks inside roles whose children are presentational (a button, a tab), not inside a link, so a
 * button in a ProductCard's stretched link would pass it. Runs in the page.
 */
async function nestedControls(page: Page): Promise<Finding[]> {
  return page.evaluate(() => {
    const outer = 'a[href], button, [role="button"], [role="link"]';
    const inner = [
      "a[href]",
      "button",
      'input:not([type="hidden"])',
      "select",
      "textarea",
      "summary",
      '[contenteditable="true"]',
      ...["button", "link", "checkbox", "radio", "switch", "tab", "menuitem", "slider"].map(
        (role) => `[role="${role}"]`,
      ),
    ].join(", ");
    const describe = (el: Element) => {
      const slot = el.getAttribute("data-slot");
      const text = (el.textContent ?? "").trim().slice(0, 30);
      return `${el.tagName.toLowerCase()}${slot ? `[data-slot=${slot}]` : ""}${text ? ` "${text}"` : ""}`;
    };
    const findings: { selector: string; detail: string }[] = [];
    for (const el of document.querySelectorAll(outer))
      for (const nested of el.querySelectorAll(`${inner}, [tabindex]`)) {
        // A `tabindex` alone makes a control only when it is a Tab stop (0 or more, not -1 or -2).
        if (!nested.matches(inner) && (nested as HTMLElement).tabIndex < 0) continue;
        // Not there for people: hidden, inert, or out of the accessibility tree.
        if (nested.closest('[aria-hidden="true"], [hidden], [inert]')) continue;
        findings.push({ selector: describe(nested), detail: `inside ${describe(el)}` });
      }
    return findings;
  });
}

/** Elements that hide or clip their overflow and have more content than box (D34). Runs in the page. */
async function clippedElements(page: Page): Promise<Finding[]> {
  return page.evaluate(() => {
    const findings: { selector: string; detail: string }[] = [];
    const clips = (value: string) => value === "hidden" || value === "clip";
    for (const el of document.body.querySelectorAll("*")) {
      const style = getComputedStyle(el);
      // Each axis on its own: `overflow-y: hidden` alone computes `overflow-x` to `auto`, and a
      // `line-clamp` or a fixed height clips lines, not width. 1 px for sub-pixel rounding.
      const overX = clips(style.overflowX) && el.scrollWidth > el.clientWidth + 1;
      const overY = clips(style.overflowY) && el.scrollHeight > el.clientHeight + 1;
      if (!overX && !overY) continue;
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
        detail: `${
          overX
            ? `scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`
            : `scrollHeight ${el.scrollHeight} > clientHeight ${el.clientHeight}`
        }; text "${(el.textContent ?? "").trim().slice(0, 40)}"`,
      });
    }
    return findings;
  });
}

/**
 * Boxes whose content scrolls sideways (T34). `overflow-y: auto` computes `overflow-x` to `auto`
 * too, so content wider than a box that scrolls down (a dialog) scrolls sideways instead of being
 * clipped, and `clippedElements` does not see it: SavedPaymentMethodCard's confirmation did, its
 * two buttons side by side in the DS's 200 px box. The boxes that are there to scroll sideways
 * are left out: a table's container and a scroll area's viewport. Runs in the page.
 */
async function sidewaysScrollers(page: Page): Promise<Finding[]> {
  return page.evaluate(() => {
    const findings: { selector: string; detail: string }[] = [];
    const scrolls = (value: string) => value === "auto" || value === "scroll";
    for (const el of document.body.querySelectorAll("*")) {
      if (!scrolls(getComputedStyle(el).overflowX) || el.scrollWidth <= el.clientWidth + 1)
        continue;
      if (el.closest('[data-slot="table-container"], [data-slot="scroll-area-viewport"]')) continue;
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

for (const id of ids) {
  for (const locale of checkedLocales) {
    for (const width of widths) {
      test(`${id} · ${locale} · ${width}`, async ({ page, baseURL }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        // D50: the browser's clock is the fixtures' (timers still run), so a countdown that the
        // server rendered from `fixtureNow` reads the same after hydration.
        await page.clock.setFixedTime(new Date(fixtureNow));
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

        const axe = await axeScan(page);
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
          .soft(lines(await sidewaysScrollers(page)), "content scrolls sideways in its box")
          .toEqual([]);
        expect
          .soft(lines(await nestedControls(page)), "interactive elements inside a link or a button")
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

// D45 (T31): an overlay drawn open stays inside its OverlayBox. The check page draws a sheet (a
// fixed popup pinned to an edge) and a popover (placed against its trigger) open, each in a box;
// without the box's containing block the sheet would be pinned to the viewport instead.
const overlayCheckPath = "/design-system/en/checks/overlay-box";

if (problem === undefined) {
  for (const width of [375, 1440]) {
    test(`overlay box · en · ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(overlayCheckPath, { waitUntil: "load" });
      expect(response?.status(), `${overlayCheckPath} answers 200`).toBe(200);
      for (const slot of ["sheet-content", "popover-content"]) {
        const box = page
          .locator("[data-overlay-box]")
          .filter({ has: page.locator(`[data-slot=${slot}]`) });
        const popup = box.locator(`[data-slot=${slot}]`);
        await expect(popup, `the ${slot} is drawn open`).toBeVisible();
        // In view, as a reader sees it: a popover whose trigger is below the viewport flips above it,
        // out of its box, and comes back once there is room (Base UI places it again on scroll).
        await box.scrollIntoViewIfNeeded();
        const placement = async () => {
          const outer = await box.boundingBox();
          const inner = await popup.boundingBox();
          if (outer === null || inner === null) return `no box for ${slot}`;
          // 1 px for sub-pixel rounding.
          const inside =
            inner.x >= outer.x - 1 &&
            inner.y >= outer.y - 1 &&
            inner.x + inner.width <= outer.x + outer.width + 1 &&
            inner.y + inner.height <= outer.y + outer.height + 1;
          return inside ? "inside" : `${JSON.stringify(inner)} outside ${JSON.stringify(outer)}`;
        };
        await expect.soft
          .poll(placement, { message: `the ${slot} lies inside its box`, timeout: 5_000 })
          .toBe("inside");
      }
      const axe = await axeScan(page);
      expect
        .soft(
          axe.violations.map((v) => `${v.id}: ${v.help}`),
          "axe violations",
        )
        .toEqual([]);
    });
  }
}

// D45 (T33): each overlay of `src/design-system/interactions.ts`, opened from its live render on the
// entry's preview page, from the keyboard, at 375 and 1440 px in `en`: axe on the open state, then
// focus. A popup that takes focus has it inside, keeps it there under Tab when it traps it, and
// gives it back to the trigger on Escape; a toast leaves it on the trigger and is announced.
const previewPath = (locale: string, id: string) => `/design-system/${locale}/preview/${id}`;

/** Whether the element holds the focused element. Runs in the page. */
const holdsFocus = (el: Element) => el.contains(document.activeElement);

/**
 * Whether focus is in the element within a second. Runs in the page. A focus trap's guard (an
 * `aria-hidden` element on each side of the popup) takes focus first and hands it on a frame or two
 * later, so the check waits for it before it counts focus as gone.
 */
const settlesInside = (el: Element) =>
  new Promise<boolean>((resolve) => {
    const start = performance.now();
    const tick = () => {
      if (el.contains(document.activeElement)) resolve(true);
      else if (performance.now() - start > 1_000) resolve(false);
      else requestAnimationFrame(tick);
    };
    tick();
  });

if (problem === undefined) {
  for (const [id, interaction] of Object.entries(interactions) as [string, DsInteraction][]) {
    for (const width of [375, 1440]) {
      test(`interaction · ${id} · en · ${width}`, async ({ page, baseURL }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.clock.setFixedTime(new Date(fixtureNow));
        const consoleMessages: Message[] = [];
        const failedRequests: FailedRequest[] = [];
        collectConsole(page, consoleMessages, failedRequests);
        const response = await page.goto(previewPath("en", id), { waitUntil: "load" });
        expect(response?.status(), `${previewPath("en", id)} answers 200`).toBe(200);
        await page.waitForLoadState("networkidle");

        const trigger = page.locator(interaction.trigger).filter({ visible: true }).first();
        const popup = page.locator(interaction.opens).filter({ visible: true }).first();
        await expect(trigger, "the live render draws the trigger").toBeVisible();
        // A press before hydration does nothing, so press again until it opens.
        await expect(async () => {
          if (!(await popup.isVisible())) {
            await trigger.focus();
            await page.keyboard.press("Enter");
          }
          await expect(popup).toBeVisible({ timeout: 1_000 });
        }, "Enter on the trigger opens it").toPass({ timeout: 10_000 });

        const axe = await axeScan(page);
        expect
          .soft(
            axe.violations.map(
              (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`,
            ),
            "axe violations, open",
          )
          .toEqual([]);

        if (interaction.focus === "inside") {
          await expect
            .poll(() => popup.evaluate(holdsFocus), { message: "focus moves into the popup" })
            .toBe(true);
          if (interaction.trap === true) {
            const stops = await popup.evaluate(
              (el) =>
                el.querySelectorAll(
                  'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
                ).length,
            );
            for (const key of ["Tab", "Shift+Tab"]) {
              let left = 0;
              for (let press = 1; press <= stops + 2 && left === 0; press += 1) {
                await page.keyboard.press(key);
                if (!(await popup.evaluate(settlesInside))) left = press;
              }
              expect.soft(left, `${key} leaves the popup after ${left} presses`).toBe(0);
            }
          }
          await page.keyboard.press("Escape");
          await expect(popup, "Escape closes it").toBeHidden();
          await expect(trigger, "focus is back on the trigger").toBeFocused();
        } else if (interaction.focus === "menu") {
          // T35: a navigation menu's panel is no dialog. Focus stays on the trigger, Tab goes into
          // the panel, Escape gives it back to the trigger, and Tab past the last link closes it.
          await expect(trigger, "focus stays on the trigger").toBeFocused();
          await page.keyboard.press("Tab");
          await expect
            .poll(() => popup.evaluate(holdsFocus), { message: "Tab moves into the panel" })
            .toBe(true);
          await page.keyboard.press("Escape");
          await expect(popup, "Escape closes it").toBeHidden();
          await expect(trigger, "focus is back on the trigger").toBeFocused();
          await page.keyboard.press("Enter");
          await expect(popup, "Enter opens it again").toBeVisible();
          const stops = await popup.evaluate(
            (el) => el.querySelectorAll("a[href], button:not([disabled])").length,
          );
          for (let press = 0; press <= stops; press += 1) await page.keyboard.press("Tab");
          await expect.soft(popup, "Tab past the panel's last link closes it").toBeHidden();
        } else {
          await expect(trigger, "focus stays on the trigger").toBeFocused();
          const announcer = await popup.evaluate((el) => {
            const live =
              '[aria-live="polite"], [aria-live="assertive"], [role="status"], [role="alert"]';
            const region = el.closest(live);
            if (region !== null)
              return region.getAttribute("aria-live") ?? region.getAttribute("role");
            // A live region elsewhere that says the popup's words.
            const text = (el.textContent ?? "").trim().slice(0, 30);
            for (const other of document.querySelectorAll(live))
              if (text !== "" && (other.textContent ?? "").includes(text))
                return other.getAttribute("aria-live") ?? other.getAttribute("role");
            return null;
          });
          expect(announcer, "a live region announces it").not.toBeNull();
        }

        const { local, summary } = judgeConsole(consoleMessages, failedRequests, baseURL);
        expect
          .soft(
            local.map((r) => `${r.url} ${r.error}`),
            "failed requests",
          )
          .toEqual([]);
        expect.soft(summary, "console errors and warnings").toEqual([]);
      });
    }
  }
}

// D44 (T35): the cart count is the browser's. Each header's preview page (its live render alone, which
// runs the real island: VisitorCartButton, fed by VisitorFixture after hydration) is prerendered, and
// its HTML, read as a crawler or `curl` reads it, has the cart's placeholder: an empty live region and
// no badge. In a browser the fixtures' count arrives once the page has hydrated.
const headerIds = entries.filter((entry) => entry.family === "header").map((entry) => entry.id);

if (problem === undefined) {
  test("the headers are in the registry (D46)", () => {
    expect(headerIds).toHaveLength(6);
  });

  for (const id of headerIds) {
    test(`the cart count · ${id}`, async ({ page }) => {
      const url = `${base}${previewPath("en", id)}`;
      const html = await (await fetch(url, { signal: AbortSignal.timeout(30_000) })).text();
      const buttons = [...html.matchAll(/<a[^>]*data-slot="cart-button"[^>]*>([\s\S]*?)<\/a>/g)];
      expect(buttons, "one cart button in the HTML").toHaveLength(1);
      const inner = buttons[0]?.[1] ?? "";
      // The live region sits beside the link, empty (PR 57 review: a page load announces nothing).
      expect(html, "the HTML has the count's empty live region").toMatch(
        /data-slot="cart-count"[^>]*><\/span>/,
      );
      expect(inner, "the HTML has no badge").not.toContain('data-slot="cart-badge"');
      expect(inner.replace(/<[^>]*>/g, ""), "the HTML names the cart alone").toBe("Cart");

      const count = commerceFixtures.en.header.cartCount;
      await page.goto(previewPath("en", id), { waitUntil: "load" });
      const button = page.locator('[data-slot="cart-button"]');
      await expect(
        button.locator('[data-slot="cart-badge"]'),
        "the count after hydration",
      ).toHaveText(String(count));
      await expect(button, "the link's name after hydration").toHaveAccessibleName(
        `Cart ${count} ${count === 1 ? "item" : "items"}`,
      );
      await expect(
        page.locator('[data-slot="cart-count"]'),
        "the first count is not announced",
      ).toHaveText("");
    });
  }
}

// D49 (T33): the flags stay on the server. Flag renders `country-flag-icons` to HTML, and
// MarketSwitcher, a client component, takes each flag as a node the server rendered, so no client
// chunk of this build holds a flag's drawing. The needle of a flag is the start of its longest path
// (`d`), from the package's string set; the markets' flags whose longest path is long enough to be
// their own (Cyprus's and the United States', at least) are the ones looked for.
const appDir = path.resolve(import.meta.dirname, "..");

/** Every `.js` file under `dir`, recursively. */
function scripts(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) return scripts(full);
    return item.name.endsWith(".js") ? [full] : [];
  });
}

if (problem === undefined) {
  test("no client chunk holds a flag (D49)", () => {
    const requireFromUi = createRequire(path.resolve(appDir, "../../packages/ui/package.json"));
    const codes = [...new Set(commerceFixtures.en.markets.map((market) => market.flagCode))];
    const needles = codes.flatMap((code) => {
      const svg = readFileSync(
        requireFromUi.resolve(`country-flag-icons/string/3x2/${code}`),
        "utf8",
      );
      const paths = [...svg.matchAll(/ d="([^"]+)"/g)].map((match) => match[1] ?? "");
      const longest = paths.sort((a, b) => b.length - a.length)[0] ?? "";
      return longest.length >= 50 ? [{ code, needle: longest.slice(0, 48) }] : [];
    });
    expect(
      needles.map((needle) => needle.code),
      "flags with a path of their own",
    ).toEqual(expect.arrayContaining(["CY", "US"]));

    const chunks = scripts(path.join(appDir, ".next", "static"));
    expect(chunks.length, "the build's client chunks (.next/static)").toBeGreaterThan(0);
    const found = chunks.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return needles
        .filter(({ needle }) => source.includes(needle))
        .map(({ code }) => `${code} in ${path.relative(appDir, file)}`);
    });
    expect(found, "flags in client chunks").toEqual([]);
  });
}
