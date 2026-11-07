import { siteOrigin } from "../../lib/site-origin";

/**
 * Live preview without JavaScript of its own (T79, D101, D102): a small inline script, drawn only
 * in Draft Mode, that does what Payload's `RefreshRouteOnSave` does by reloading the frame. It
 * tells the admin the frame is ready (`payload-live-preview`, to the opener or the parent, at
 * `siteOrigin()`), and reloads the page when the admin says a document was saved
 * (`payload-document-event`, from that origin exactly), so the draft is drawn again. The product
 * page uses it for the `templates` global's preview (D101): `RefreshOnSave`'s loader
 * ships on every request of a page that imports it, and on the product page T77 measured a
 * `next/dynamic` loader at 335.5 KB, over the 335 KB budget (SETUP.md, "Versions and CI for M5
 * (T77)"); a script in the HTML costs no chunk. The reload scrolls to the top, where a refresh
 * would not.
 */
export function reloadOnSaveScript(origin: string): string {
  // The origin is a JSON string with `<` escaped, so it cannot close the element.
  const quoted = JSON.stringify(origin).replaceAll("<", "\\u003c");
  return [
    "(function(){",
    `var o=${quoted};`,
    'addEventListener("message",function(e){',
    'if(e.origin===o&&e.data&&typeof e.data==="object"&&e.data.type==="payload-document-event")location.reload();',
    "});",
    "var w=window.opener||window.parent;",
    'if(w&&w!==window)w.postMessage({type:"payload-live-preview",ready:true},o);',
    "})();",
  ].join("");
}

/** The script, for a page to draw in Draft Mode only (nothing is drawn for a shopper). */
export function ReloadOnSave() {
  return <script dangerouslySetInnerHTML={{ __html: reloadOnSaveScript(siteOrigin()) }} />;
}
