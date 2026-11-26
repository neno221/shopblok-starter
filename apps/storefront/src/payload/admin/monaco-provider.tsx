"use client";

import loader from "@monaco-editor/loader";
import type { ReactNode } from "react";
import { MONACO_VS } from "./monaco-path";

// M7 D141 (T107): Payload's code and JSON fields render `@payloadcms/ui`'s `CodeEditor`, which uses
// `@monaco-editor/react` and passes it no loader settings, so `@monaco-editor/loader` would fetch
// Monaco from `cdn.jsdelivr.net`. This module sets the loader's path to the shop's own copy when it
// is evaluated, which is before any editor mounts (providers wrap the whole admin, and the loader
// reads its path only in `init()`, from an editor's effect). It works only because this import and
// `@monaco-editor/react`'s are the same module, with one state: the storefront pins the same
// `@monaco-editor/loader` 1.7.0, so pnpm links one copy (`monaco-path.test.ts` resolves both).
loader.config({ paths: { vs: MONACO_VS } });

/** An `admin.components.providers` entry: nothing to render, the import is what counts. */
export function MonacoProvider({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
