/**
 * M7 D142 (T108): Medusa's limiter. Sign-ins are counted per signed address and e-mail; a call the
 * storefront did not sign, or signed for another path, method or address, is counted on the
 * caller's own address; a `server` call skips the per-address counters but not a cart's; the
 * storefront's own rules are consumed through `POST /shopblok/rate-limit`, which takes signed calls
 * only; and with Redis stopped every request passes, with one warning. SETUP.md, "Rate limits and
 * Turnstile (T108)", lists the mutations each test catches.
 *
 * Run (the compose stack up, from the repo root):
 *
 *   pnpm --filter @shopblok/backend test:integration:http rate-limit.spec
 */
import { createHash } from "node:crypto";

import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { createApiKeysWorkflow } from "@medusajs/medusa/core-flows";

import { Limiter, setProcessLimiter } from "../../src/lib/rate-limit/limiter";
import { clientHeader } from "../../src/lib/rate-limit/signature";
import { MemoryStore, RedisStore } from "../../src/lib/rate-limit/store";

jest.setTimeout(180_000);

const SECRET = "integration-test-signing-secret-0123456789";
process.env.STOREFRONT_SIGNING_SECRET = SECRET;

const anyStatus = { validateStatus: () => true };
const now = () => Math.floor(Date.now() / 1000);

/** The header the storefront's server sends for `address` on this call. */
const signed = (address: string, method: string, path: string) => ({
  "x-shopblok-client": clientHeader(SECRET, { address, time: now(), method, path }),
});

const LOGIN = "/auth/customer/emailpass";
const ADMIN_LOGIN = "/auth/user/emailpass";

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("D142: the rate limits", () => {
      let storeHeaders: Record<string, string>;
      let serial = 0;
      /** A fresh visitor address and e-mail per test: the counters live as long as the app. */
      const visitor = () => {
        serial += 1;
        return { address: `203.0.113.${serial}`, email: `visitor${serial}@example.com` };
      };

      const post = (path: string, body: object, headers: Record<string, string> = {}) =>
        api.post(path, body, { headers, ...anyStatus });

      const statuses = async (n: number, call: () => Promise<{ status: number }>) => {
        const out: number[] = [];
        for (let i = 0; i < n; i += 1) out.push((await call()).status);
        return out;
      };

      beforeEach(async () => {
        // A fresh in-memory limiter per test, so one test's counters never decide another's.
        setProcessLimiter(new Limiter(new MemoryStore()));
        const { result } = await createApiKeysWorkflow(getContainer()).run({
          input: { api_keys: [{ title: "Storefront", type: "publishable", created_by: "" }] },
        });
        storeHeaders = { "x-publishable-api-key": result[0]!.token };
      });

      afterAll(() => setProcessLimiter(undefined));

      it("refuses the 11th customer login in 15 minutes for one signed address and e-mail", async () => {
        const { address, email } = visitor();
        const login = (from: string) =>
          post(LOGIN, { email, password: "wrong-password" }, signed(from, "POST", LOGIN));

        expect(await statuses(10, () => login(address))).toEqual(Array(10).fill(401));
        const refused = await login(address);

        expect(refused.status).toBe(429);
        expect(refused.headers["retry-after"]).toBe("900");
        expect(refused.data).toEqual({
          type: "too_many_requests",
          message: "Too many requests: retry after 900 s.",
          retry_after: 900,
        });
        // Another visitor, signed, with the same e-mail passes.
        expect((await login(visitor().address)).status).toBe(401);
      });

      it("refuses Medusa Admin's 11th sign-in the same way", async () => {
        const { address, email } = visitor();
        const login = (from: string) =>
          post(ADMIN_LOGIN, { email, password: "wrong" }, signed(from, "POST", ADMIN_LOGIN));

        expect(await statuses(10, () => login(address))).toEqual(Array(10).fill(401));
        expect((await login(address)).status).toBe(429);
        expect((await login(visitor().address)).status).toBe(401);
      });

      it.each([
        ["the customer's sign-in", LOGIN, "/auth/customer/%65mailpass", 401],
        ["Medusa Admin's sign-in", ADMIN_LOGIN, "/auth/user/%65mailpass", 401],
        [
          "the customer's sign-in, with two letters encoded",
          LOGIN,
          "/auth/%63ustomer/emailp%61ss",
          401,
        ],
      ])(
        "counts %s on a percent-encoded path on the same counter",
        async (_name, plain, encoded, status) => {
          const { address, email } = visitor();
          const login = (path: string) =>
            post(path, { email, password: "wrong" }, signed(address, "POST", path));

          expect(await statuses(5, () => login(plain))).toEqual(Array(5).fill(status));
          expect(await statuses(5, () => login(encoded))).toEqual(Array(5).fill(status));
          expect((await login(encoded)).status).toBe(429);
          expect((await login(plain)).status).toBe(429);
        },
      );

      it("counts a percent-encoded register and reset on the same counters", async () => {
        const { address } = visitor();
        const register = (path: string, n: number) =>
          post(
            path,
            { email: `register${n}@example.com`, password: "secret-password-1" },
            signed(address, "POST", path),
          );
        const paths = ["/auth/customer/emailpass/register", "/auth/customer/%65mailpass/register"];
        const results: number[] = [];
        for (let n = 0; n < 5; n += 1) results.push((await register(paths[n % 2]!, n)).status);
        expect(results).not.toContain(429);
        expect((await register(paths[1]!, 5)).status).toBe(429);

        const reset = (path: string) =>
          post(path, { identifier: "nobody@example.com" }, signed(address, "POST", path));
        const resets = [
          "/auth/user/emailpass/reset-password",
          "/auth/user/%65mailpass/reset-password",
        ];
        const resetResults: number[] = [];
        for (let n = 0; n < 3; n += 1) resetResults.push((await reset(resets[n % 2]!)).status);
        expect(resetResults).not.toContain(429);
        expect((await reset(resets[1]!)).status).toBe(429);
      });

      it("limits verification requests per address, whatever e-mail each names", async () => {
        // Medusa answers 401 before the limiter without a registration token, so a caller with one.
        const registered = await post(
          "/auth/customer/emailpass/register",
          { email: visitor().email, password: "secret-password-1" },
          signed(visitor().address, "POST", "/auth/customer/emailpass/register"),
        );
        expect(registered.status).toBe(200);
        const authorization = `Bearer ${registered.data.token as string}`;
        const { address } = visitor();
        const PATH = "/auth/verification/request";
        const ask = (n: number) =>
          post(
            PATH,
            { entity_id: `someone${n}@example.com`, entity_type: "email" },
            { authorization, ...signed(address, "POST", PATH) },
          );

        const results: number[] = [];
        for (let n = 0; n < 20; n += 1) results.push((await ask(n)).status);
        expect(results).not.toContain(429);
        expect((await ask(20)).status).toBe(429);
      });

      it("keys an unsigned call on the caller's own address", async () => {
        const { email } = visitor();
        const unsigned = () => post(LOGIN, { email, password: "wrong" });

        expect(await statuses(10, unsigned)).toEqual(Array(10).fill(401));
        expect((await unsigned()).status).toBe(429);
        // The caller's address is Express's `req.ip`: Medusa trusts one proxy hop (`trust proxy` 1,
        // Railway's), so a call through a proxy is counted for the address that proxy saw.
        expect(
          (await post(LOGIN, { email, password: "x" }, { "x-forwarded-for": "198.51.100.9" }))
            .status,
        ).toBe(401);
        // A signed visitor is not in the caller's counter.
        expect(
          (
            await post(
              LOGIN,
              { email, password: "wrong" },
              signed(visitor().address, "POST", LOGIN),
            )
          ).status,
        ).toBe(401);
      });

      it("keys a forged signature on the caller, never on the address it names", async () => {
        const { address: named, email } = visitor();
        const good = signed(named, "POST", LOGIN)["x-shopblok-client"];
        const forged = { "x-shopblok-client": good.replace(/[0-9a-f]{8}$/, "00000000") };

        expect(await statuses(11, () => post(LOGIN, { email, password: "wrong" }, forged))).toEqual(
          [...Array(10).fill(401), 429],
        );
        // The named address's own counter is untouched.
        expect(
          (await post(LOGIN, { email, password: "wrong" }, signed(named, "POST", LOGIN))).status,
        ).toBe(401);
      });

      it("keys a header replayed on another path or method on the caller", async () => {
        const { address: named, email } = visitor();
        const forAdmin = signed(named, "POST", ADMIN_LOGIN);
        const forGet = signed(named, "GET", LOGIN);

        const replays = await statuses(
          11,
          (() => {
            let i = 0;
            return () =>
              post(LOGIN, { email, password: "wrong" }, i++ % 2 === 0 ? forAdmin : forGet);
          })(),
        );

        expect(replays).toEqual([...Array(10).fill(401), 429]);
        expect(
          (await post(LOGIN, { email, password: "wrong" }, signed(named, "POST", LOGIN))).status,
        ).toBe(401);
      });

      it("lets a `server` call past /store/*'s limit, but not past a cart's", async () => {
        const path = "/store/regions";
        const asServer = () =>
          api.get(`${path}?limit=1`, {
            headers: { ...storeHeaders, ...signed("server", "GET", path) },
            ...anyStatus,
          });
        const server = await statuses(605, asServer);

        expect(server.filter((status) => status === 429)).toHaveLength(0);

        const complete = "/store/carts/cart_does_not_exist/complete";
        const asServerComplete = () =>
          post(complete, {}, { ...storeHeaders, ...signed("server", "POST", complete) });
        const carts = await statuses(11, asServerComplete);

        expect(carts.slice(0, 10)).not.toContain(429);
        expect(carts[10]).toBe(429);
      });

      it("refuses the 601st /store/* call in a minute from one address", async () => {
        const { address } = visitor();
        const path = "/store/regions";
        const call = () =>
          api.get(`${path}?limit=1`, {
            headers: { ...storeHeaders, ...signed(address, "GET", path) },
            ...anyStatus,
          });
        const results = await statuses(601, call);

        expect(results.slice(0, 600)).not.toContain(429);
        expect(results[600]).toBe(429);
      });

      it("limits cart completion per cart, whoever asks", async () => {
        const complete = "/store/carts/cart_per_cart/complete";
        const results = await statuses(11, () =>
          post(complete, {}, { ...storeHeaders, ...signed(visitor().address, "POST", complete) }),
        );

        expect(results.slice(0, 10)).not.toContain(429);
        expect(results[10]).toBe(429);
      });

      describe("POST /shopblok/rate-limit", () => {
        const ROUTE = "/shopblok/rate-limit";
        const ask = (body: object, headers: Record<string, string>) => post(ROUTE, body, headers);

        it("answers 403 to an unsigned or forged call", async () => {
          expect((await ask({ rule: "form", key: "7" }, {})).status).toBe(403);
          const forged = signed("203.0.113.250", "POST", "/shopblok/other");

          expect((await ask({ rule: "form", key: "7" }, forged)).status).toBe(403);
        });

        it("consumes a storefront rule for the signed address and key", async () => {
          const { address, email } = visitor();
          const key = createHash("sha256").update(email).digest("hex");
          const sign = () => signed(address, "POST", ROUTE);
          const answers: unknown[] = [];

          for (let i = 0; i < 6; i += 1)
            answers.push((await ask({ rule: "newsletter", key }, sign())).data);

          expect(answers.slice(0, 2)).toEqual([
            { allowed: true, retryAfter: 0 },
            { allowed: true, retryAfter: 0 },
          ]);
          // 2 a day per e-mail.
          expect(answers[2]).toEqual({ allowed: false, retryAfter: 86_400 });
          // Another e-mail from the same address: 5 an hour per address, counted with the above.
          const other = createHash("sha256").update(`other-${email}`).digest("hex");

          expect((await ask({ rule: "newsletter", key: other }, sign())).data).toEqual({
            allowed: false,
            retryAfter: 3_600,
          });
        });

        it("takes the storefront's rules only, and a key of its shape", async () => {
          const { address } = visitor();

          for (const body of [
            { rule: "customer-login", key: "x" },
            { rule: "store" },
            { rule: "form", key: "not a key!" },
            {},
          ]) {
            expect((await ask(body, signed(address, "POST", ROUTE))).status).toBe(400);
          }
        });
      });

      it("lets requests through with Redis stopped, with one warning", async () => {
        const warnings: string[] = [];
        // Port 1: nothing listens there, as when Medusa's Redis is down.
        const store = new RedisStore("redis://127.0.0.1:1", (message) => warnings.push(message));

        setProcessLimiter(new Limiter(store));
        try {
          const { email } = visitor();
          const results = await statuses(15, () =>
            post("/auth/customer/emailpass/register", { email, password: "secret-password-1" }),
          );

          expect(results).not.toContain(429);
          expect(warnings).toHaveLength(1);
          expect(warnings[0]).toMatch(/Redis cannot be reached/);
        } finally {
          await store.close();
        }
      });
    });
  },
});
