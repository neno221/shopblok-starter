"use client";

import { useEffect, useRef, useState } from "react";

export const VIEWPORT_WIDTHS = [375, 768, 1440] as const;

const FRAME_HEIGHT = 720;
const GAP = 16;
const TOTAL_WIDTH = VIEWPORT_WIDTHS.reduce((sum, width) => sum + width, 0) + GAP * 2;

type Mode = "all" | (typeof VIEWPORT_WIDTHS)[number];

/**
 * The entry's frame at 375, 768 and 1440 px (SPEC §9.6): three iframes of the frame route side by
 * side, scaled down together to fit the column, or one at a time at its real width. Each iframe
 * loads the bare render, so what you see is what D34's checks run on. The labels are the shell's
 * English chrome and come in as props.
 */
export function ViewportSwitcher({
  frameSrc,
  entryLabel,
  labels,
}: {
  frameSrc: string;
  entryLabel: string;
  labels: { all: string; scaleNote: string; title: string; openFrame: string };
}) {
  const [mode, setMode] = useState<Mode>("all");
  const [available, setAvailable] = useState(TOTAL_WIDTH);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = box.current;
    if (element === null) return;
    const observer = new ResizeObserver(([observed]) => {
      if (observed !== undefined) setAvailable(observed.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const shown = mode === "all" ? VIEWPORT_WIDTHS : [mode];
  // One scale for the three, so their proportions stay true; a single frame is never scaled up.
  const natural = mode === "all" ? TOTAL_WIDTH : mode;
  const scale = Math.min(1, available / natural);

  return (
    <div>
      <div role="group" aria-label={entryLabel} className="flex flex-wrap items-center gap-2">
        {(["all", ...VIEWPORT_WIDTHS] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => setMode(option)}
            className="hover:bg-accent aria-pressed:bg-primary aria-pressed:text-primary-foreground focus-visible:ring-ring min-h-11 min-w-11 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none aria-pressed:hover:bg-primary"
          >
            {option === "all" ? labels.all : `${option} px`}
          </button>
        ))}
        <a className="ms-auto text-sm underline" href={frameSrc} target="_blank" rel="noreferrer">
          {labels.openFrame}
        </a>
      </div>
      <div ref={box} className="mt-4 w-full overflow-hidden">
        <div className="flex items-start" style={{ gap: GAP * scale }}>
          {shown.map((width) => (
            <div
              key={width}
              data-viewport={width}
              style={{ width: width * scale, height: FRAME_HEIGHT * scale }}
              className="shrink-0 overflow-hidden rounded-md border"
            >
              <iframe
                title={`${labels.title} ${width} px: ${entryLabel}`}
                src={frameSrc}
                loading="lazy"
                style={{
                  width,
                  height: FRAME_HEIGHT,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
                className="block border-0 bg-background"
              />
            </div>
          ))}
        </div>
        {scale < 1 && (
          <p className="text-muted-foreground mt-2 text-xs">
            {labels.scaleNote} ({Math.round(scale * 100)} %)
          </p>
        )}
      </div>
    </div>
  );
}
