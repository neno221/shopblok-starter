/**
 * Medusa's search filter tree (`SearchTypes.SearchFilters`) as a Meilisearch filter expression.
 * What Meilisearch cannot express (`$prefix`, `$like`: it has no substring filter) is refused, as
 * the provider contract asks, rather than approximated.
 */
import { MedusaError } from "@medusajs/framework/utils";

type Filters = Record<string, unknown>;

// Field paths come from the index definition (the Search Module checks them before a provider sees
// them); this is a second fence, since a path is written into the expression as it is.
const FIELD_PATTERN = /^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*$/;

const refuse = (message: string): never => {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, `Meilisearch: ${message}`);
};

function literal(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : refuse(`"${value}" is not a number it can filter on`);
  }

  if (typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "string") {
    // Meilisearch reads `\"` and `\\` inside a double-quoted string, as JSON writes them.
    return JSON.stringify(value);
  }

  return refuse(`a filter value must be a string, number, boolean, date or null`);
}

const list = (field: string, values: unknown): string => {
  if (!Array.isArray(values)) {
    return refuse(`"${field}" needs a list of values`);
  }

  return `[${values.map(literal).join(", ")}]`;
};

/** An empty `IN []` matches nothing, as an empty list of ids should (T64's product type with none). */
const inList = (field: string, values: unknown) => `${field} IN ${list(field, values)}`;

function equals(field: string, value: unknown): string {
  return value === null ? `${field} IS NULL` : `${field} = ${literal(value)}`;
}

function operatorClause(field: string, operator: string, operand: unknown): string {
  switch (operator) {
    case "$eq":
      return equals(field, operand);
    case "$ne":
      return operand === null ? `${field} IS NOT NULL` : `${field} != ${literal(operand)}`;
    case "$in":
    case "$overlaps":
      return inList(field, operand);
    case "$nin":
      return `${field} NOT IN ${list(field, operand)}`;
    case "$lt":
      return `${field} < ${literal(operand)}`;
    case "$lte":
      return `${field} <= ${literal(operand)}`;
    case "$gt":
      return `${field} > ${literal(operand)}`;
    case "$gte":
      return `${field} >= ${literal(operand)}`;
    case "$exists":
      return operand ? `${field} EXISTS` : `${field} NOT EXISTS`;
    case "$contains": {
      // Every value must be there: one equality per value (on an array field, `=` means "holds").
      const values = Array.isArray(operand) ? operand : [operand];

      return values.length
        ? values.map((value) => equals(field, value)).join(" AND ")
        : refuse(`"$contains" on "${field}" needs at least one value`);
    }
    default:
      return refuse(`the filter operator "${operator}" (on "${field}") has no Meilisearch equivalent`);
  }
}

function fieldClause(field: string, value: unknown): string {
  if (!FIELD_PATTERN.test(field)) {
    return refuse(`"${field}" is not a field path it can filter on`);
  }

  if (Array.isArray(value)) {
    return inList(field, value);
  }

  if (value === null || typeof value !== "object" || value instanceof Date) {
    return equals(field, value);
  }

  const clauses = Object.entries(value as Record<string, unknown>)
    .filter(([, operand]) => operand !== undefined)
    .map(([operator, operand]) => operatorClause(field, operator, operand));

  if (!clauses.length) {
    return refuse(`"${field}" has an empty operator map`);
  }

  return clauses.length === 1 ? clauses[0]! : `(${clauses.join(" AND ")})`;
}

/**
 * The expression for a filter tree, or `undefined` when it filters nothing. `primaryKey` names a
 * field every document has, for the one expression Meilisearch has no literal for: "nothing"
 * (`$or` with no alternatives), written as `<primary key> IN []`.
 */
export function compileFilters(filters: Filters | undefined, primaryKey = "id"): string | undefined {
  if (!filters) {
    return undefined;
  }

  const clauses: string[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || key === "q") {
      continue;
    }

    if (key === "$and" || key === "$or") {
      if (!Array.isArray(value)) {
        return refuse(`"${key}" needs a list of filters`);
      }

      const parts = (value as Filters[]).map((part) => compileFilters(part, primaryKey));

      if (key === "$and") {
        const set = parts.filter((part): part is string => part !== undefined);

        if (set.length) {
          clauses.push(`(${set.join(" AND ")})`);
        }
      } else if (!parts.length) {
        clauses.push(`${primaryKey} IN []`);
      } else if (parts.every((part) => part !== undefined)) {
        // An alternative with no condition matches everything, and so does the whole `$or`.
        clauses.push(`(${parts.join(" OR ")})`);
      }
    } else if (key === "$not") {
      const part = compileFilters(value as Filters, primaryKey);

      // `NOT` of no condition is "nothing".
      clauses.push(part ? `NOT (${part})` : `${primaryKey} IN []`);
    } else {
      clauses.push(fieldClause(key, value));
    }
  }

  return clauses.length ? clauses.join(" AND ") : undefined;
}

/** The filter for a document key, recognised so a delete by id takes Meilisearch's fast path. */
export function idsOnly(filters: Filters, primaryKey: string): string[] | undefined {
  const keys = Object.keys(filters).filter((key) => filters[key] !== undefined);

  if (keys.length !== 1 || keys[0] !== primaryKey) {
    return undefined;
  }

  const value = filters[primaryKey];

  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value) && value.every((id) => typeof id === "string")) {
    return value as string[];
  }

  const operand = (value as { $in?: unknown } | null)?.$in;

  return Array.isArray(operand) && operand.every((id) => typeof id === "string") &&
    Object.keys(value as object).length === 1
    ? (operand as string[])
    : undefined;
}

