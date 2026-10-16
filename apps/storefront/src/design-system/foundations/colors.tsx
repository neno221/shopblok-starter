import { colors, contrast } from "@shopblok/ui/tokens";

type TokenColor = {
  name: string;
  variable: string;
  value: string;
  source: string;
  group: string;
  kit?: { source: string; value: string; reason: string };
};

type TokenPair = {
  id: string;
  kind: string;
  minimum: number;
  foreground: { name: string; value: string };
  background: { name: string; value: string };
  ratio: number;
  kit?: { ratio: number; passes: boolean };
};

const palette: readonly TokenColor[] = colors;
const pairs: readonly TokenPair[] = contrast;

const groupTitles: Record<string, string> = {
  contract: "shadcn's contract (SPEC §9.2)",
  commerce: "Commerce additions",
};

function Swatch({ color }: { color: TokenColor }) {
  return (
    <li className="rounded-lg border p-3">
      <div className="flex gap-2">
        <span
          aria-hidden="true"
          className="block h-12 flex-1 rounded-md border"
          style={{ backgroundColor: color.value }}
        />
        {color.kit && (
          <span
            aria-hidden="true"
            className="block h-12 w-12 rounded-md border"
            style={{ backgroundColor: color.kit.value }}
          />
        )}
      </div>
      <p className="mt-2 text-sm font-medium">{color.name}</p>
      <p className="text-muted-foreground text-xs">
        <code>{color.variable}</code> <code>{color.value}</code>
      </p>
      <p className="text-muted-foreground text-xs">From {color.source}</p>
      {color.kit && (
        <p className="mt-1 text-xs">
          Kit: <code>{color.kit.value}</code> ({color.kit.source}). {color.kit.reason}
        </p>
      )}
    </li>
  );
}

function PairRow({ pair }: { pair: TokenPair }) {
  const passes = pair.ratio >= pair.minimum;
  return (
    <tr className="border-t">
      <th scope="row" className="py-2 pe-3 text-start font-normal">
        <span
          aria-hidden="true"
          className="me-2 inline-block rounded-sm border px-2 text-xs"
          style={{
            color: pair.foreground.value,
            backgroundColor: pair.background.value,
          }}
        >
          Aa
        </span>
        <code>{pair.foreground.name}</code> on <code>{pair.background.name}</code>
      </th>
      <td className="py-2 pe-3">
        {pair.kind === "text" ? "Text" : "UI"} ≥ {pair.minimum}:1
      </td>
      <td className="py-2 pe-3 tabular-nums">{pair.ratio.toFixed(2)}:1</td>
      <td className="py-2 pe-3">{passes ? "Pass" : "Fail"}</td>
      <td className="py-2 tabular-nums">
        {pair.kit
          ? `${pair.kit.ratio.toFixed(2)}:1 (${pair.kit.passes ? "pass" : "fail"})`
          : "Same"}
      </td>
    </tr>
  );
}

/** The colour tokens with the kit's value beside ours where we override it, and every contrast pair. */
export function Colors() {
  const groups = [...new Set(palette.map((color) => color.group))];
  return (
    <div>
      {groups.map((group) => (
        <div key={group} className="mt-6 first:mt-0">
          <h3 className="text-base font-semibold">{groupTitles[group] ?? group}</h3>
          <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
            {palette
              .filter((color) => color.group === group)
              .map((color) => (
                <Swatch key={color.name} color={color} />
              ))}
          </ul>
        </div>
      ))}
      <h3 className="mt-8 text-base font-semibold">Contrast pairs</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        The build fails below these ratios (WCAG 2.2: 4.5:1 for text, 3:1 for UI components). Where
        the kit&apos;s own colours differ, its ratio is on the right.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <caption className="sr-only">
            Contrast ratio of every foreground and background pair
          </caption>
          <thead>
            <tr className="text-start">
              <th scope="col" className="pe-3 pb-2 text-start font-medium">
                Pair
              </th>
              <th scope="col" className="pe-3 pb-2 text-start font-medium">
                Rule
              </th>
              <th scope="col" className="pe-3 pb-2 text-start font-medium">
                Ratio
              </th>
              <th scope="col" className="pe-3 pb-2 text-start font-medium">
                Result
              </th>
              <th scope="col" className="pb-2 text-start font-medium">
                Kit
              </th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair) => (
              <PairRow key={pair.id} pair={pair} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
