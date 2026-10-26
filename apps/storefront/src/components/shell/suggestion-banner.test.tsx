// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ path: "/ch/fr", asked: [] as [unknown, unknown][] }));
vi.mock("next/navigation", () => ({ usePathname: () => state.path }));
vi.mock("../../lib/actions/shell", () => ({
  renderSuggestionBanner: vi.fn(async (market: unknown, path: unknown) => {
    state.asked.push([market, path]);
    return <p data-testid="banner">{String(path)}</p>;
  }),
}));

import { resetVisitor, setVisitor, type VisitorSuggestion } from "../../lib/visitor/store";
import { SuggestionBannerIsland } from "./suggestion-banner";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLElement;
const draw = () => act(async () => root.render(<SuggestionBannerIsland market="fr-ch" />));

beforeEach(() => {
  state.path = "/ch/fr";
  state.asked = [];
  resetVisitor();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  resetVisitor();
});

const suggest = () =>
  act(async () =>
    setVisitor({
      cartCount: 0,
      consent: null,
      suggestion: { market: "en-us" } as VisitorSuggestion,
    }),
  );

describe("SuggestionBannerIsland (D66)", () => {
  it("draws nothing and asks nothing until the store has a suggestion", async () => {
    await draw();
    expect(container.innerHTML).toBe("");
    expect(state.asked).toEqual([]);
  });

  it("draws the action's banner for the page the visitor is on, and again after a navigation", async () => {
    await draw();
    await suggest();
    expect(state.asked).toEqual([["fr-ch", "/ch/fr"]]);
    expect(container.textContent).toBe("/ch/fr");
    state.path = "/ch/fr/products/tee";
    await draw();
    expect(state.asked.at(-1)).toEqual(["fr-ch", "/ch/fr/products/tee"]);
    expect(container.textContent).toBe("/ch/fr/products/tee");
  });
});
