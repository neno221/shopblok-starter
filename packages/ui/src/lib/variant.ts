import type { Family, VariantOf } from "@shopblok/registry/contracts";

/**
 * A family's members by variant (D99): the components a family's entry file draws, keyed by the
 * values of `contracts/variants.ts`, the first being the family's default. The storefront's drift
 * test checks that the keys are the family's values in the registry's order.
 */
export type Members<F extends Family, Component> = { readonly [V in VariantOf<F>]: Component };

/** What was logged already: one line per family and unknown value, per server process. */
const logged = new Set<string>();

/**
 * The member a family's entry file draws for `variant` (D99). No value draws the first member. A
 * value the family does not have (a stored one from a later version, or one a variant task took
 * away) also draws the first, and says so once in the server's log, so a page never fails on it.
 */
export function pickVariant<F extends Family, Component>(
  family: F,
  members: Members<F, Component>,
  variant: string | undefined,
): Component {
  const values = Object.keys(members) as VariantOf<F>[];
  const first = members[values[0]!];
  if (variant === undefined) return first;
  if (Object.hasOwn(members, variant)) return members[variant as VariantOf<F>];
  const key = `${family}/${variant}`;
  if (!logged.has(key)) {
    logged.add(key);
    console.warn(
      `${family}: no variant "${variant}" (a value from another version?); drawing "${values[0]}".`,
    );
  }
  return first;
}

/** Forgets what `pickVariant` logged, for the tests. */
export function resetVariantLog(): void {
  logged.clear();
}
