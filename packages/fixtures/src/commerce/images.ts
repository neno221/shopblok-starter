import type { Image } from "@shopblok/registry/contracts";

// Photographs for the fixtures (T30 step 3): flat shapes in muted colours, as data-URI SVGs like
// `sampleImage`, so there is no file to ship, no network call and no licence. A seed picks the
// colours and the shape, so neighbouring products do not look alike; the same seed gives the same
// picture in every locale, and only the alternative text, which the caller passes, is translated.

/** The sizes the fixtures draw, by aspect ratio (width : height). */
export const imageRatios = {
  "3:4": { width: 600, height: 800 },
  "1:1": { width: 800, height: 800 },
  "4:3": { width: 800, height: 600 },
  "16:9": { width: 1600, height: 900 },
} as const;

export type ImageRatio = keyof typeof imageRatios;

type Palette = readonly [background: string, ground: string, shape: string];

// The first is `sampleImage`'s. All are low in contrast on purpose: a picture should not compete
// with the text or the price a molecule draws over or beside it.
const palettes: readonly Palette[] = [
  ["#d9cdb8", "#a99b82", "#f2ede2"],
  ["#c9d3cf", "#8fa39b", "#eef2f0"],
  ["#d8d2dc", "#a59cae", "#f1eef3"],
  ["#cfd8e3", "#93a4b8", "#eef2f7"],
  ["#e3d3c8", "#bd9f8c", "#f6eee8"],
  ["#d4d7c6", "#9ea388", "#f0f1e7"],
  ["#dcd6cf", "#b0a79d", "#f4f1ed"],
  ["#cfcfd4", "#9a9aa5", "#eeeef1"],
];

const shapeKinds = 5;

/** The foreground shape of kind `kind`, placed by fractions of the canvas so every ratio works. */
function shape(kind: number, width: number, height: number, fill: string): string {
  const x = (fraction: number) => Math.round(width * fraction);
  const y = (fraction: number) => Math.round(height * fraction);
  const reach = Math.min(width, height);
  switch (kind) {
    case 0: // a rounded block, as in `sampleImage`
      return `<rect x="${x(0.25)}" y="${y(0.2)}" width="${x(0.5)}" height="${y(0.45)}" rx="${Math.round(reach * 0.04)}" fill="${fill}"/>`;
    case 1: // a disc
      return `<circle cx="${x(0.5)}" cy="${y(0.42)}" r="${Math.round(reach * 0.24)}" fill="${fill}"/>`;
    case 2: // an arch: a block with a round top
      return `<path d="M${x(0.3)} ${y(0.68)}V${y(0.4)}A${x(0.2)} ${x(0.2)} 0 0 1 ${x(0.7)} ${y(0.4)}V${y(0.68)}Z" fill="${fill}"/>`;
    case 3: // two blocks of different heights
      return `<rect x="${x(0.2)}" y="${y(0.3)}" width="${x(0.28)}" height="${y(0.38)}" fill="${fill}"/><rect x="${x(0.52)}" y="${y(0.22)}" width="${x(0.28)}" height="${y(0.46)}" fill="${fill}"/>`;
    default: // a trapezoid, wider at the bottom
      return `<polygon points="${x(0.3)},${y(0.22)} ${x(0.7)},${y(0.22)} ${x(0.78)},${y(0.66)} ${x(0.22)},${y(0.66)}" fill="${fill}"/>`;
  }
}

/**
 * A neutral picture of aspect ratio `ratio`, chosen by `seed` (any non-negative integer), with the
 * `alt` text the caller wrote in the locale. Its `width` and `height` are the intrinsic size.
 */
export function fixtureImage({
  seed,
  ratio,
  alt,
}: {
  seed: number;
  ratio: ImageRatio;
  alt: string;
}): Image {
  const { width, height } = imageRatios[ratio];
  const [background, ground, foreground] = palettes[seed % palettes.length]!;
  // The palette repeats every eight seeds, the shape cycles through five (shifted by one each
  // round of eight) and the disc comes with every second round, so seeds that share a palette
  // differ in shape or disc: 80 seeds give 80 different pictures.
  const round = Math.floor(seed / 8);
  const kind = (seed + round) % shapeKinds;
  // A small disc in a top corner, like a lamp or a window.
  const disc =
    round % 2 === 1
      ? `<circle cx="${Math.round(width * 0.82)}" cy="${Math.round(height * 0.14)}" r="${Math.round(Math.min(width, height) * 0.06)}" fill="${foreground}" fill-opacity="0.6"/>`
      : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="${background}"/>` +
    `<rect y="${Math.round(height * 0.7)}" width="${width}" height="${height - Math.round(height * 0.7)}" fill="${ground}"/>` +
    `${disc}${shape(kind, width, height, foreground)}</svg>`;
  return { src: `data:image/svg+xml,${encodeURIComponent(svg)}`, alt, width, height };
}
