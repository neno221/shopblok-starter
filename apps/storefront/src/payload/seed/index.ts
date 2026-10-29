import { emailTemplatesSeed } from "./email-templates";
export { SEED_GLOBALS } from "./globals";
import { pagesSeed } from "./pages";
import type { SeedModule } from "./types";

/** Every content type's seed, in the order they run (later tasks add theirs). */
export const SEED_MODULES: SeedModule[] = [pagesSeed, emailTemplatesSeed];
