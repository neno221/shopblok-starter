// S3 PROTOTYPE. L9, HTTP half, against the server on :8000 (production build): the admin's edit view,
// list view and the Markets global view as a browser navigation gets them (fetch-metadata headers
// make Next render the dynamic part), and the REST API.  node spike/s3/bench-http.mjs [N]
const B = "http://localhost:8000";
const N = Number(process.argv[2] ?? 100);
const json = { "content-type": "application/json", Origin: B };
const { token } = await (await fetch(`${B}/api/users/login`, { method: "POST", headers: json, body: JSON.stringify({ email: "owner@example.com", password: "correct-horse-battery" }) })).json();
const navigation = {
  Cookie: `payload-token=${token}`,
  Accept: "text/html,application/xhtml+xml",
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0 Safari/537.36",
  "Sec-CH-Prefers-Color-Scheme": "light",
  "Sec-Fetch-Dest": "document", "Sec-Fetch-Mode": "navigate", "Sec-Fetch-Site": "none", "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1", "Accept-Language": "en-US,en;q=0.9",
};
const first = await (await fetch(`${B}/api/s3-rich?limit=1&sort=id&depth=0`, { headers: { Authorization: `JWT ${token}` } })).json();
const id = first.docs[0].id;

const stats = (ms) => {
  const s = [...ms].sort((a, b) => a - b);
  const at = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
  return { n: ms.length, p50: +at(0.5).toFixed(2), p95: +at(0.95).toFixed(2), mean: +(ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(2) };
};
async function time(name, n, warm, request, check) {
  for (let i = 0; i < warm; i++) await request();
  const samples = []; let bytes = 0;
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    const r = await request();
    const body = await r.arrayBuffer();
    samples.push(performance.now() - t);
    bytes = body.byteLength;
    if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
    if (i === 0 && check) check(new TextDecoder().decode(body));
  }
  return { ...stats(samples), bytes };
}
const out = {};
out["admin edit view (el)"] = await time("edit", N, 5, () => fetch(`${B}/admin/collections/s3-rich/${id}?locale=el`, { headers: navigation }), (h) => { if (!h.includes("text24")) throw new Error("edit view is not the dynamic render"); });
out["admin edit view (en)"] = await time("edit en", N, 5, () => fetch(`${B}/admin/collections/s3-rich/${id}?locale=en`, { headers: navigation }));
out["admin list view"] = await time("list", Math.max(20, N / 2), 5, () => fetch(`${B}/admin/collections/s3-rich?locale=el&limit=10`, { headers: navigation }));
out["admin Markets global view"] = await time("markets", Math.max(20, N / 2), 5, () => fetch(`${B}/admin/globals/markets?locale=en`, { headers: navigation }));
out["REST GET /api/s3-rich/:id?locale=el"] = await time("rest", N, 10, () => fetch(`${B}/api/s3-rich/${id}?locale=el&depth=0`, { headers: { Authorization: `JWT ${token}` } }));
out["REST GET public /api/pages?locale=el"] = await time("rest pages", N, 10, () => fetch(`${B}/api/pages?locale=el`));
console.log(JSON.stringify({ benchHttp: out }));
