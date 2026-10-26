// D60 (T47): the island that runs `loadVisitor` once after hydration. The `[market]` layout draws
// it (T48) beside the header; it draws nothing. An effect, never the render, which also runs on the
// server, where the store is the process's (D44).
"use client";

import { useEffect } from "react";
import { loadVisitor } from "./source";

export function VisitorSource({ market }: { market: string }) {
  useEffect(() => {
    void loadVisitor(market, window.location.pathname);
  }, [market]);
  return null;
}
