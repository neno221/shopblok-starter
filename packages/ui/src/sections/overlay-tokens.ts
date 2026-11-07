// Ours (T80, moved here by T82; D100's rule for text on a picture). The tokens inside an `overlay`
// scrim (60 % black: light text keeps 5.7:1 on a white photo): light text and ring, a light button
// with dark text, an outline button on no fill, a countdown's boxes a darker scrim. The transparent
// header remaps its tokens the same way, so every part inside keeps its own contrast pairing with no
// class of ours on it. Written in full so Tailwind finds them. The hero's `overlay`, the promo
// banner's and the media-with-text's `full-bleed` draw their words on it.
export const overlayTokens =
  "text-overlay-foreground [--foreground:var(--overlay-foreground)] [--muted-foreground:var(--overlay-foreground)] [--muted:var(--overlay)] [--background:transparent] [--border:var(--overlay-foreground)] [--ring:var(--overlay-foreground)] [--primary:var(--overlay-foreground)] [--primary-foreground:var(--neutral-950)]";
