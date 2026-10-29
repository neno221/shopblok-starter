import type { CollectionBeforeDeleteHook } from "payload";
import { describe, expect, it, vi } from "vitest";
import { keepFormWithSubmissions } from "./forms";

// D81 (T67): a form with submissions is not deleted, so visitors' answers never go with it.

function remove(submissions: number) {
  const count = vi.fn().mockResolvedValue({ totalDocs: submissions });
  const run = keepFormWithSubmissions({
    id: 7,
    req: { payload: { count } },
  } as unknown as Parameters<CollectionBeforeDeleteHook>[0]);
  return { run, count };
}

describe("keepFormWithSubmissions", () => {
  it("refuses to delete a form with submissions, and says how", async () => {
    const { run, count } = remove(1);
    await expect(run).rejects.toThrow(/has a submission: an admin deletes them/);
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "form-submissions",
        where: { form: { equals: 7 } },
        overrideAccess: true,
      }),
    );
    await expect(remove(3).run).rejects.toThrow(/has 3 submissions/);
  });

  it("lets a form without submissions be deleted", async () => {
    await expect(remove(0).run).resolves.toBeUndefined();
  });
});
