import { revalidateTag } from "next/cache";
import { expect, it } from "vitest";
import { OUTSIDE_NEXT } from "./revalidate-pages";

// The one test here that does not mock `next/cache`: the hook tells "outside a Next request" from
// a real failure by the message Next throws, and nothing else ties that string to the installed
// Next. When an upgrade rewords it, this fails, instead of script saves starting to log warnings.
it("revalidateTag, called outside a Next request, throws the message the hook treats as quiet", () => {
  expect(() => revalidateTag("pages:el", "max")).toThrow(OUTSIDE_NEXT);
});
