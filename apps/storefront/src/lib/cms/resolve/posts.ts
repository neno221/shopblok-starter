import "server-only";
import type { Messages } from "@shopblok/i18n";
import { readPostList, readPostsByIds } from "../posts";
import type { CmsReader } from "../read";
import type { PostsContext } from "./editorial";

/**
 * The journal's reads for a page's `editorialList` blocks (T66), in the reader's language and Draft
 * Mode. Without a database each read gives nothing, so the block is left out.
 */
export function postsContext(reader: CmsReader, messages: Messages): PostsContext {
  return {
    newest: async (limit) => (await readPostList(reader, 1, limit))?.posts ?? [],
    byIds: async (ids) => (await readPostsByIds(reader, ids)) ?? [],
    journalLabel: messages.sections.editorialList.all,
  };
}
