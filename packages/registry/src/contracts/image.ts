import { z } from "zod";

/** An image as a component draws it: where it is, what it shows, and its intrinsic size. */
export const Image = z
  .object({
    src: z
      .string()
      .regex(/^(?:data:image\/|https?:\/\/|\/(?!\/))/, "a data URI, an http(s) URL or a path")
      .describe("A data URI, an http(s) URL or a path from /"),
    alt: z.string().describe('What the image shows; "" for a decorative one'),
    width: z.int().positive(),
    height: z.int().positive(),
  })
  .describe("An image with its alternative text and intrinsic size");

export type Image = z.infer<typeof Image>;
