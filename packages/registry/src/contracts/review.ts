import { z } from "zod";
import { Id, IsoDateTime } from "./content";

/** One review (ReviewItem). */
export const Review = z.object({
  id: Id,
  author: z.string().min(1),
  rating: z.int().min(1).max(5),
  title: z.string().min(1).optional(),
  body: z.string().min(1),
  createdAt: IsoDateTime,
  verified: z.boolean().describe("Bought by the reviewer (the verified mark)"),
});

/** The average and count a product card shows. */
export const RatingOverview = z.object({
  average: z.number().min(0).max(5),
  count: z.int().nonnegative(),
});

/** A product's ratings (RatingSummary): the average, the count and how many gave each star. */
export const RatingSummary = RatingOverview.extend({
  distribution: z
    .array(z.object({ stars: z.int().min(1).max(5), count: z.int().nonnegative() }))
    .length(5)
    .describe("One row per star, 5 to 1"),
}).superRefine((summary, context) => {
  const stars = summary.distribution.map((row) => row.stars);
  if ([5, 4, 3, 2, 1].some((star, index) => stars[index] !== star))
    context.addIssue({
      code: "custom",
      message: "the rows are 5, 4, 3, 2, 1 stars, in that order",
    });
  const total = summary.distribution.reduce((sum, row) => sum + row.count, 0);
  if (total !== summary.count)
    context.addIssue({
      code: "custom",
      message: `the rows add up to ${total}, not ${summary.count}`,
    });
});

export type Review = z.infer<typeof Review>;
export type RatingOverview = z.infer<typeof RatingOverview>;
export type RatingSummary = z.infer<typeof RatingSummary>;
