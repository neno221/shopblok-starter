import { catalogs } from "@shopblok/i18n";
import { z } from "zod";

const copy = catalogs.en.designSystem.props;

/** One row of the table: a property of the contract's view model. */
export type PropRow = { name: string; type: string; required: boolean; description?: string };

type JsonSchema = {
  type?: string | string[];
  enum?: unknown[];
  const?: unknown;
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  description?: string;
};

/** A property's type in a few words: `string`, `"sale" | "regular"`, `number[]`, `object`. */
function typeOf(schema: JsonSchema): string {
  if (schema.enum !== undefined)
    return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  const union = schema.anyOf ?? schema.oneOf;
  if (union !== undefined) return union.map(typeOf).join(" | ");
  if (schema.type === "array") return `${schema.items ? typeOf(schema.items) : "unknown"}[]`;
  if (Array.isArray(schema.type)) return schema.type.join(" | ");
  return schema.type ?? "unknown";
}

/**
 * The rows of an entry's "Props" table (D41): the top-level properties of its contract, read from
 * `z.toJSONSchema`, in the schema's order. A contract that is not an object has no rows. The
 * schema is the input's (what a caller passes), so a prop with a default is not required; a type
 * JSON Schema cannot express (a date, a transform) shows as `unknown` instead of throwing, which
 * would fail the prerender (PR 51 review, items 1 and 2).
 */
export function propRows(contract: z.ZodType): PropRow[] {
  const schema = z.toJSONSchema(contract, { io: "input", unrepresentable: "any" }) as JsonSchema;
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).map(([name, property]) => ({
    name,
    type: typeOf(property),
    required: required.has(name),
    ...(property.description !== undefined && { description: property.description }),
  }));
}

/** The "Props" section's table: one row per property, with its type and whether it is required. */
export function PropsTable({ contract }: { contract: z.ZodType }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-start text-sm">
        <caption className="text-muted-foreground mb-2 text-start">{copy.caption}</caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className="py-2 pe-4 text-start font-medium">
              {copy.name}
            </th>
            <th scope="col" className="py-2 pe-4 text-start font-medium">
              {copy.type}
            </th>
            <th scope="col" className="py-2 pe-4 text-start font-medium">
              {copy.required}
            </th>
            <th scope="col" className="py-2 text-start font-medium">
              {copy.description}
            </th>
          </tr>
        </thead>
        <tbody>
          {propRows(contract).map((row) => (
            <tr key={row.name} className="border-b align-top">
              <th scope="row" className="py-2 pe-4 text-start font-mono font-normal">
                {row.name}
              </th>
              <td className="py-2 pe-4 font-mono">{row.type}</td>
              <td className="py-2 pe-4">{row.required ? copy.yes : copy.no}</td>
              <td className="py-2">{row.description ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
