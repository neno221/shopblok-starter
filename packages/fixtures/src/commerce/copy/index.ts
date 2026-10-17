import type { DesignSystemLocale } from "../../design-system";
import { de } from "./de";
import { el } from "./el";
import { en } from "./en";
import { fr } from "./fr";
import type { Copy } from "./types";

export type { Copy } from "./types";

/** Each locale's words. */
export const copies: Record<DesignSystemLocale, Copy> = { en, el, de, fr };
