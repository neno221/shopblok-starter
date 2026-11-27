// Test-only: the value `/[market]/e2e-taint` taints and hands to a Client Component, and
// `e2e/taint.spec.ts` looks for in the answer (PR 158 review, item 1). It is made for the probe and
// guards nothing, so the page proves the taint guard without holding a real secret: were the guard
// ever off, or React's API gone, the page would print this string and the spec would fail, and no
// deployment's secret would be in the answer. Long enough for `taintSecret` (`MIN_SECRET_LENGTH`).
export const TAINT_PROBE_VALUE = "e2e-taint-probe-not-a-secret-7f3c9a1e5b2d4086";
