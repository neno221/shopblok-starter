/**
 * S2 prototype (not for main, D13). Compiles Medusa's search filter DSL into a Meilisearch
 * filter expression. Only what `/store/search` and the S2 tests send is covered; anything
 * else throws, as the provider contract asks ("reject the operators it can't express").
 */
import { MedusaError } from "@medusajs/framework/utils";

type Value = string | number | boolean | Date | null;

const literal = (value: Value): string => {
  if (value === null) {
    return "null";
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  return typeof value === "string" ? JSON.stringify(value) : String(value);
};

const list = (values: Value[]) => `[${values.map(literal).join(", ")}]`;

function fieldClause(field: string, value: any): string {
  if (value === null || typeof value !== "object" || value instanceof Date) {
    return value === null ? `${field} IS NULL` : `${field} = ${literal(value)}`;
  }

  if (Array.isArray(value)) {
    return `${field} IN ${list(value)}`;
  }

  const clauses = Object.entries(value).map(([operator, operand]: [string, any]) => {
    switch (operator) {
      case "$eq":
        return fieldClause(field, operand);
      case "$ne":
        return `${field} != ${literal(operand)}`;
      case "$in":
      case "$overlaps":
        return `${field} IN ${list(operand)}`;
      case "$nin":
        return `${field} NOT IN ${list(operand)}`;
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
      case "$contains":
        return Array.isArray(operand)
          ? operand.map((v) => `${field} = ${literal(v)}`).join(" AND ")
          : `${field} = ${literal(operand)}`;
      default:
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `The meilisearch provider does not support the filter operator "${operator}"`,
        );
    }
  });

  return clauses.length === 1 ? clauses[0]! : `(${clauses.join(" AND ")})`;
}

export function compileFilters(filters: Record<string, any> | undefined): string | undefined {
  if (!filters) {
    return undefined;
  }

  const clauses: string[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) {
      continue;
    }

    if (key === "$and" || key === "$or") {
      const parts = (value as Record<string, any>[])
        .map((part) => compileFilters(part))
        .filter((part): part is string => Boolean(part));

      if (parts.length) {
        clauses.push(`(${parts.join(key === "$and" ? " AND " : " OR ")})`);
      }
    } else if (key === "$not") {
      const part = compileFilters(value);

      if (part) {
        clauses.push(`NOT (${part})`);
      }
    } else {
      clauses.push(fieldClause(key, value));
    }
  }

  return clauses.length ? clauses.join(" AND ") : undefined;
}
