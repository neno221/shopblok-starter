import {
  configureStoreSearch,
  defineMiddlewares,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from '@medusajs/framework/http'
import { isTruthy } from '@medusajs/framework/utils'

import { localizedSearchOptions, S2_INDEXES } from '../search/helpers/s2-shared'

// S2 prototype (not for main, D13): the index variants of the spike are searchable on
// /store/search while S2_SPIKE is set.
const spike = isTruthy(process.env.S2_SPIKE)
const s2Indexes = spike
  ? Object.fromEntries(S2_INDEXES.map((index) => [index.name, true as const]))
  : {}

type SearchQuery = { entity: string; search_options?: Record<string, unknown> }

// S2 prototype: `/store/search` ignores the request's locale (Medusa sets `req.locale` for every
// /store route from `x-medusa-locale` or `?locale=`, and the search route never reads it). This
// turns it into the options the index behind the entity needs, so a storefront sends the same
// request whichever provider is active. Options the caller sent win.
function localizeStoreSearch(req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) {
  const body = (req as unknown as { validatedBody?: SearchQuery & { queries?: SearchQuery[] } })
    .validatedBody
  const locale = (req as unknown as { locale?: string }).locale

  if (body && locale) {
    for (const query of body.queries ?? [body]) {
      const index = S2_INDEXES.find((candidate) => candidate.name === query.entity)

      if (index) {
        query.search_options = { ...localizedSearchOptions(index, locale), ...query.search_options }
      }
    }
  }

  next()
}

// The product index declares filterable `status` and `sales_channel_ids`, so
// the route narrows it to published products in the key's sales channels.
export default defineMiddlewares({
  routes: [
    {
      method: ['POST'],
      matcher: '/store/search',
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
            ...s2Indexes,
          },
        }),
        ...(spike ? [localizeStoreSearch] : []),
      ],
    },
  ],
})
