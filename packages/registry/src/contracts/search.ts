import { z } from "zod";
import { Link } from "./content";
import { ProductCard } from "./product";

/** What the search overlay shows for a query: products, matching categories and suggestions. */
export const SearchResult = z.object({
  query: z.string(),
  total: z.int().nonnegative().describe("Every match, of which `products` are the first"),
  products: z.array(ProductCard),
  categories: z.array(Link),
  suggestions: z.array(z.string().min(1)),
});

export type SearchResult = z.infer<typeof SearchResult>;
