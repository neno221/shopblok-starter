import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReloadOnSave, reloadOnSaveScript } from "./reload-on-save";

// T79: the product page's live preview is an inline script, which this runs as the browser would.
const run = (origin: string, win: Record<string, unknown>) =>
  new Function("window", "addEventListener", "location", reloadOnSaveScript(origin))(
    win,
    win["addEventListener"],
    win["location"],
  );

afterEach(() => vi.unstubAllEnvs());

describe("ReloadOnSave", () => {
  it("tells the admin the frame is ready, and reloads on a save from the site's origin only", () => {
    let listener: ((event: { origin: string; data: unknown }) => void) | undefined;
    const parent = { postMessage: vi.fn() };
    const location = { reload: vi.fn() };
    run("http://localhost:8000", {
      opener: null,
      parent,
      location,
      addEventListener: (_type: string, fn: typeof listener) => (listener = fn),
    });
    expect(parent.postMessage).toHaveBeenCalledWith(
      { type: "payload-live-preview", ready: true },
      "http://localhost:8000",
    );
    listener?.({ origin: "https://elsewhere.example", data: { type: "payload-document-event" } });
    listener?.({ origin: "http://localhost:8000", data: { type: "payload-live-preview" } });
    expect(location.reload).not.toHaveBeenCalled();
    listener?.({ origin: "http://localhost:8000", data: { type: "payload-document-event" } });
    expect(location.reload).toHaveBeenCalledTimes(1);
  });

  it("posts nothing outside a frame or a popup", () => {
    const win: Record<string, unknown> = { opener: null, addEventListener: () => undefined };
    win["parent"] = win;
    win["postMessage"] = vi.fn();
    run("http://localhost:8000", win);
    expect(win["postMessage"]).not.toHaveBeenCalled();
  });

  it("draws the site's origin, escaped so it cannot close the element", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://shop.example/");
    expect(renderToStaticMarkup(<ReloadOnSave />)).toContain('var o="https://shop.example";');
    expect(reloadOnSaveScript("</script>")).not.toContain("</script>");
  });
});
