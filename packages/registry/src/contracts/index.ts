// The view models' zod schemas (D41): what a molecule or organism shows, defined once here, with its
// TypeScript type inferred from it (each schema and its type share a name). `@shopblok/ui` imports
// the types only (`import type`), so no schema reaches a client bundle; `@shopblok/fixtures` is
// typed by them and its test parses every fixture; M3's resolvers map the DAL's DTOs to them, and M4
// passes Payload's content through the same parse. Copy (D43), actions and slots are props of their
// own, never part of a contract. Only what SPEC §9.3's components show; M3 extends them.

export * from "./address";
export * from "./cart";
export * from "./checkout";
export * from "./content";
export * from "./facets";
export * from "./footer";
export * from "./header";
export * from "./image";
export * from "./listing";
export * from "./listing-organisms";
export * from "./market";
export * from "./money";
export * from "./navigation";
export * from "./order";
export * from "./payment";
export * from "./product";
export * from "./product-page";
export * from "./review";
export * from "./search";
export * from "./shipping";
export * from "./site";
