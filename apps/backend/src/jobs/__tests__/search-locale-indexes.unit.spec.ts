import searchLocaleIndexes, { config } from "../search-locale-indexes";

describe("search-locale-indexes job (T94, PR 139's review item 1)", () => {
  it("runs every five minutes", () => {
    expect(config).toEqual({ name: "search-locale-indexes", schedule: "*/5 * * * *" });
  });

  it("logs a failure instead of throwing", async () => {
    const warn = jest.fn();
    const container = {
      resolve: (key: string) =>
        ({
          search: {
            listIndexes: async () => {
              throw new Error("down");
            },
          },
          logger: { warn },
        })[key],
    } as never;

    await expect(searchLocaleIndexes(container)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("down"));
  });
});
