"use client";

import { useEffect } from "react";
import { rememberSearch } from "../../lib/visitor/recent-searches";

// D66 (T50): the search page puts its query first among the overlay's recent ones
// (`localStorage`), as Enter in the overlay does. It draws nothing.
export function RememberSearch({ query }: { query: string }) {
  useEffect(() => rememberSearch(query), [query]);
  return null;
}
