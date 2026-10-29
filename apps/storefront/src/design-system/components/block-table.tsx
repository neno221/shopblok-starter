import { catalogs, formatMessage } from "@shopblok/i18n";
import { describeBlock } from "../../payload/blocks/describe";

const copy = catalogs.en.designSystem.block;

/**
 * The "Payload block" panel of a Sections entry (D70): the fields of the block the entry names,
 * read from `src/payload/blocks/` (`describeBlock`), so the panel is the config, not a copy of it.
 * A nested field follows its array or group, by its path (`items.title`). The registry names the
 * block and stays free of Payload; this storefront page reads both.
 */
export function BlockTable({ slug }: { slug: string }) {
  const rows = describeBlock(slug);
  if (rows === null) throw new Error(`The design system has no Payload block "${slug}".`);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-start text-sm">
        <caption className="text-muted-foreground mb-2 text-start">
          {formatMessage(copy.caption, { slug }, "en")}
        </caption>
        <thead>
          <tr className="border-b">
            {[copy.field, copy.type, copy.localized, copy.required, copy.options].map((label) => (
              <th key={label} scope="col" className="py-2 pe-4 text-start font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.path} className="border-b align-top" data-field={row.path}>
              <th scope="row" className="py-2 pe-4 text-start font-mono font-normal">
                {row.path}
              </th>
              <td className="py-2 pe-4 font-mono">{row.type}</td>
              <td className="py-2 pe-4">{row.localized ? copy.yes : copy.no}</td>
              <td className="py-2 pe-4">
                {row.required ? (row.conditional ? copy.yesWhenShown : copy.yes) : copy.no}
              </td>
              <td className="py-2 font-mono break-words">{row.options?.join(" | ") ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
