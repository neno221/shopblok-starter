import type { Image } from "@shopblok/registry/contracts";

/**
 * An uploaded logo in the Logo atom's slot (T61): as tall as the slot, its width from its own
 * proportions. Its alternative text is empty, because the Logo atom names it with the store's name.
 */
export function ShellLogo({ image }: { image: Image }) {
  return (
    // An upload's file, served by Payload at its own size; the slot is 32 px tall.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.src}
      alt=""
      width={image.width}
      height={image.height}
      className="h-full w-auto max-w-full object-contain"
    />
  );
}
