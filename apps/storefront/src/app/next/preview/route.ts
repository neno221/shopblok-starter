import { previewResponse } from "../../../lib/cms/preview";
import { previewDeps } from "../../../lib/cms/preview-deps";

// Draft Mode for a signed-in editor, then the page (D74). Payload's live preview opens this.
export const GET = (request: Request) => previewResponse(request, previewDeps);
