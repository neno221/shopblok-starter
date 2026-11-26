// M7 D141 (T107): where the admin's code editor loads Monaco from: the shop's own copy, not
// `cdn.jsdelivr.net`. `scripts/copy-monaco.ts` copies `monaco-editor/min/vs` here before `next build`
// and `next dev`, and `monaco-provider.tsx` points `@monaco-editor/loader` at it. The version is the
// one `@monaco-editor/loader` 1.7.0 asks jsdelivr for (its `config/index.js`), which the storefront
// pins as a dev dependency; `monaco-path.test.ts` holds the three together.

export const MONACO_VERSION = "0.55.1";

/** The folder under `public/` that holds the copy. */
export const MONACO_PUBLIC_DIR = `vendor/monaco/${MONACO_VERSION}/vs`;

/** The same folder as the browser asks for it. */
export const MONACO_VS = `/${MONACO_PUBLIC_DIR}`;
