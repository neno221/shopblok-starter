// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `video` block's entry file: this file is
// what `@shopblok/ui/sections/video` reaches, and it draws the member of the block's `variant`,
// each in its own file in `./video/` (`standard.tsx`, M4's, is the first). A value the family does
// not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { VideoStandard, type VideoSectionProps } from "./video/standard";

const MEMBERS: Members<"video", (props: VideoSectionProps) => React.ReactNode> = {
  standard: VideoStandard,
};

function VideoSection(props: VideoSectionProps) {
  const Member = pickVariant("video", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { VideoSection };
export type { VideoSectionProps };
