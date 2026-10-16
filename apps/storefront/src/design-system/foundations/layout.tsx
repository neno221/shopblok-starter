import { breakpoints, viewports, zIndex } from "@shopblok/ui/tokens";
import { layerNotes } from "./classes";

/** Breakpoints, the design widths and the layers. */
export function LayoutTokens() {
  return (
    <div>
      <h3 className="text-base font-semibold">Breakpoints</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        Tailwind&apos;s five, which are the kit&apos;s.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {breakpoints.map((point) => (
          <li key={point.name} className="rounded-md border px-3 py-1 text-sm">
            <code>{point.name}</code> {point.px} px
          </li>
        ))}
      </ul>
      <h3 className="mt-8 text-base font-semibold">Design widths</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        <code>--viewport-*</code>: the widths the screens are designed and checked at. The viewport
        switcher uses 375, 768 and 1440 px.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {viewports.map((viewport) => (
          <li key={viewport.name} className="rounded-md border px-3 py-1 text-sm">
            <code>{viewport.name}</code> {viewport.value}
          </li>
        ))}
      </ul>
      <h3 className="mt-8 text-base font-semibold">Layers</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        <code>z-(--z-…)</code>, lowest first.
      </p>
      <ol className="mt-3">
        {zIndex.map((layer) => (
          <li key={layer.name} className="flex flex-wrap gap-x-4 border-t py-2 text-sm">
            <code className="w-40">--z-{layer.name}</code>
            <span className="w-10 tabular-nums">{layer.value}</span>
            <span className="text-muted-foreground">{layerNotes[layer.name] ?? ""}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
