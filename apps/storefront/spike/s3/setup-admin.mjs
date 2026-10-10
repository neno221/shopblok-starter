// S3 PROTOTYPE. The first admin and the `markets` global (en, el, de, fr) on the server at :8000.
const B = "http://localhost:8000";
const json = { "content-type": "application/json", Origin: B };
const init = await (await fetch(`${B}/api/users/init`)).json();
if (!init.initialized) {
  const r = await fetch(`${B}/api/users/first-register`, { method: "POST", headers: json, body: JSON.stringify({ email: "owner@example.com", password: "correct-horse-battery", "confirm-password": "correct-horse-battery" }) });
  if (!r.ok) throw new Error(`first-register ${r.status}`);
}
const { token } = await (await fetch(`${B}/api/users/login`, { method: "POST", headers: json, body: JSON.stringify({ email: "owner@example.com", password: "correct-horse-battery" }) })).json();
const countries = [["cy", "el"], ["us", "en"], ["de", "de"], ["fr", "fr"]].map(([code, language]) => ({ code, enabled: true, languages: [language] }));
const locale = { en: "en-US", el: "el-GR", de: "de-DE", fr: "fr-FR" };
const body = { countries, languages: Object.entries(locale).map(([code, medusaLocale]) => ({ code, medusaLocale })), primaryCountry: "cy", fallbackMarket: "en-us" };
const r = await fetch(`${B}/api/globals/markets`, { method: "POST", headers: { ...json, Authorization: `JWT ${token}` }, body: JSON.stringify(body) });
if (!r.ok) throw new Error(`markets ${r.status} ${await r.text()}`);
console.log("admin and markets ready");
