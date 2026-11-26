import { deployEnv } from "../deploy-env";

describe("deployEnv (M7 D133's order, the storefront's and doctor's twin)", () => {
  it.each([
    [{}, undefined],
    [{ NODE_ENV: "development" }, undefined],
    [{ NODE_ENV: "test" }, undefined],
    [{ NODE_ENV: "production" }, "production"],
    [{ VERCEL_ENV: "development", NODE_ENV: "production" }, undefined],
    [{ VERCEL_ENV: "production" }, "production"],
    [{ VERCEL_ENV: "preview", NODE_ENV: "production" }, "staging"],
    [{ DEPLOY_ENV: "staging", NODE_ENV: "production" }, "staging"],
    [{ DEPLOY_ENV: "staging", VERCEL_ENV: "production" }, "staging"],
    [{ DEPLOY_ENV: " production " }, "production"],
    [{ DEPLOY_ENV: "", NODE_ENV: "production" }, "production"],
    [{ DEPLOY_ENV: "production", VERCEL_ENV: "preview", NODE_ENV: "production" }, "staging"],
  ])("%o is %s", (env, expected) => {
    expect(deployEnv(env)).toBe(expected);
  });

  it("throws for any other DEPLOY_ENV, naming it", () => {
    for (const DEPLOY_ENV of ["prod", "Staging", "preview", "development"]) {
      expect(() => deployEnv({ DEPLOY_ENV, NODE_ENV: "production" })).toThrow(
        `(it is "${DEPLOY_ENV}")`,
      );
    }
  });
});
