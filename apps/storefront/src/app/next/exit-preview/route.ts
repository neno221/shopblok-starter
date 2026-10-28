import { exitPreviewResponse } from "../../../lib/cms/preview";
import { previewDeps } from "../../../lib/cms/preview-deps";

// Draft Mode off, back to the published page (D74). POST only.
export const POST = (request: Request) => exitPreviewResponse(request, previewDeps);
