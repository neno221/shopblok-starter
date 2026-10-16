import { iconsInUse } from "../icons";

/** The icons the atoms use, and the credits for what the page and the tokens are built on. */
export function IconsAndCredits() {
  return (
    <div>
      <h3 className="text-base font-semibold">Icons in use</h3>
      {iconsInUse.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">
          No atom draws an icon yet. Atoms list the icons they use in{" "}
          <code>src/design-system/icons.ts</code>, and this list shows them.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
          {iconsInUse.map((icon) => (
            <li key={icon.name} className="rounded-lg border p-3 text-sm">
              <icon.Icon aria-hidden="true" className="size-6" />
              <p className="mt-2">
                <code>{icon.name}</code>
              </p>
              <p className="text-muted-foreground text-xs">Used by {icon.usedBy.join(", ")}</p>
            </li>
          ))}
        </ul>
      )}
      <h3 className="mt-8 text-base font-semibold">Credits</h3>
      <ul className="mt-3 list-disc ps-5 text-sm">
        <li>
          The tokens and atoms are adapted from{" "}
          <a
            className="underline"
            href="https://www.figma.com/community/file/1649373313065184861/shadcn-ui-design-system-by-reui"
          >
            shadcn/ui – Design System by ReUI
          </a>
          , a Figma Community file by ReUI, licensed under{" "}
          <a className="underline" href="https://creativecommons.org/licenses/by/4.0/">
            CC BY 4.0
          </a>
          . Changes: the colours the build&apos;s contrast gate rejects, and the commerce tokens.
        </li>
        <li>
          The 17 shadcn atoms are vendored from{" "}
          <a className="underline" href="https://ui.shadcn.com">
            shadcn/ui
          </a>{" "}
          (style base-vega, MIT) on{" "}
          <a className="underline" href="https://base-ui.com">
            Base UI
          </a>{" "}
          (MIT), and draw{" "}
          <a className="underline" href="https://lucide.dev">
            Lucide
          </a>{" "}
          icons (ISC). The notices are in <code>packages/ui/NOTICE.md</code>.
        </li>
        <li>
          The typeface is{" "}
          <a className="underline" href="https://rsms.me/inter/">
            Inter
          </a>{" "}
          by Rasmus Andersson, under the SIL Open Font License 1.1.
        </li>
      </ul>
    </div>
  );
}
