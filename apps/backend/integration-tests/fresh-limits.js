// M7 D142 (T108): each integration test starts with fresh rate-limit counters, as it starts with a
// fresh database. Without `REDIS_URL` (`.env.test`) the limiter keeps them in memory for the life of
// the app, which one spec file shares across its tests: five tests that each register and verify
// `ada@example.com` would otherwise reach the per-e-mail limits. `rate-limit.spec.ts` checks the
// limits themselves.
const { setProcessLimiter } = require("../src/lib/rate-limit/limiter");

beforeEach(() => setProcessLimiter(undefined));
