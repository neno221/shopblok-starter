"use client";

import { useEffect, useRef, useState } from "react";

const FRAME_HEIGHT = 720;
const GAP = 16;

type Mode = "all" | number;

/**
 * One scale for everything shown, so the proportions stay true: it fits the measured column and a
 * frame is never scaled up. Before the first measurement (`available` is `null`: the server render
 * and the first client render) it is 0, so no frame is drawn at 1:1 and cropped for a moment.
 */
export function viewportScale(available: number | null, natural: number): number {
  return available === null ? 0 : Math.min(1, available / natural);
}

/**
 * The entry's frame at the three preview widths (SPEC §9.6; 375, 768 and 1440 px from the viewport
 * tokens, see `viewportWidths`): three iframes of the frame route side by side, or one at a time.
 * Either way the frames are scaled down to fit a column narrower than they are, and the note says
 * by how much; "Open the frame" shows one at 1:1. Each iframe loads the bare render, so what you
 * see is what D34's checks run on. The labels are the shell's English chrome and come in as props.
 */
export function ViewportSwitcher({
  frameSrc,
  entryLabel,
  widths,
  labels,
}: {
  frameSrc: string;
  entryLabel: string;
  widths: readonly number[];
  labels: { all: string; group: string; scaleNote: string; title: string; openFrame: string };
}) {
  const [mode, setMode] = useState<Mode>("all");
  const [available, setAvailable] = useState<number | null>(null);
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

  const shown = mode === "all" ? widths : [mode];
  const natural =
    mode === "all"
      ? widths.reduce((sum, width) => sum + width, 0) + GAP * (widths.length - 1)
      : mode;
  const scale = viewportScale(available, natural);

  return (
    <div>
      <div role="group" aria-label={labels.group} className="flex flex-wrap items-center gap-2">
        {(["all", ...widths] as const).map((option) => (
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
        <div
          className={available === null ? "invisible flex items-start" : "flex items-start"}
          style={{ gap: GAP * scale }}
        >
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
        {available !== null && scale < 1 && (
          <p className="text-muted-foreground mt-2 text-xs">
            {labels.scaleNote} ({Math.round(scale * 100)} %)
          </p>
        )}
      </div>
    </div>
  );
}
