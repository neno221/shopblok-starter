import { text } from "@shopblok/ui/tokens";
import type { DsContext } from "../types";
import { textClasses, weightClasses } from "./classes";

/** The type scale and the weights, set in the page's locale (Greek uses Inter's Greek subset, D28). */
export function Typography({ ctx }: { ctx: DsContext }) {
  const { fixture } = ctx;
  return (
    <div>
      <p className="text-muted-foreground text-sm">
        Inter, from <code>next/font</code> (<code>--font-sans</code>). The sample is the
        locale&apos;s product name.
      </p>
      <h3 className="mt-6 text-base font-semibold">Scale</h3>
      <ul className="mt-3">
        {text.map((step) => (
          <li
            key={step.step}
            className="grid grid-cols-1 gap-x-4 gap-y-1 border-t py-3 sm:grid-cols-[9rem_1fr]"
          >
            <p className="text-muted-foreground text-sm">
              <code>{textClasses[step.step]}</code>
              <br />
              {step.sizePx} / {step.lineHeightPx} px
            </p>
            <p
              lang={fixture.market.htmlLang}
              className={`${textClasses[step.step]} [overflow-wrap:anywhere]`}
            >
              {fixture.ordinary.productName}
            </p>
          </li>
        ))}
      </ul>
      <h3 className="mt-6 text-base font-semibold">Weights</h3>
      <ul className="mt-3">
        {weightClasses.map((weight) => (
          <li
            key={weight.name}
            className="grid grid-cols-1 gap-x-4 border-t py-3 sm:grid-cols-[9rem_1fr]"
          >
            <p className="text-muted-foreground text-sm">
              <code>{weight.className}</code>
            </p>
            <p lang={fixture.market.htmlLang} className={`text-lg ${weight.className}`}>
              {fixture.ordinary.productDescription}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
