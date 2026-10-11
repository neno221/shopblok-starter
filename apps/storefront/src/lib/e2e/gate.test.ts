import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));

afterEach(() => vi.unstubAllEnvs());

describe("e2eGate", () => {
  it("answers 404 and lets nothing run unless E2E_TEST_ROUTES is exactly `true`", async () => {
    const { e2eGate } = await import("./gate");
    for (const value of [undefined, "", "1", "TRUE", "false"]) {
      vi.stubEnv("E2E_TEST_ROUTES", value as string);
      const response = await e2eGate();
      expect(response?.status, `E2E_TEST_ROUTES=${String(value)}`).toBe(404);
      expect(await response?.text()).toBe("Not Found");
    }
  });

  it("lets the route run when the variable is `true`", async () => {
    const { e2eGate } = await import("./gate");
    vi.stubEnv("E2E_TEST_ROUTES", "true");
    expect(await e2eGate()).toBeNull();
  });

  it("makes the handler dynamic before it reads the variable", async () => {
    const { connection } = await import("next/server");
    const { e2eGate } = await import("./gate");
    vi.mocked(connection).mockClear();
    vi.stubEnv("E2E_TEST_ROUTES", "true");
    await e2eGate();
    expect(connection).toHaveBeenCalledTimes(1);
  });
});
