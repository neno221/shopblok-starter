import { configureStoreSearch, defineMiddlewares } from '@medusajs/framework/http'

import { requireVerifiedCustomer } from './store/customers/verified'
import { localizeStoreSearch } from './store/search/locale'

// The product index declares filterable `status` and `sales_channel_ids`, so
// the route narrows it to published products in the key's sales channels.
// `localizeStoreSearch` then gives the index the request's locale, checked
// against the store's (D63).
export default defineMiddlewares({
  routes: [
    {
      method: ['POST'],
      matcher: '/store/search',
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
        localizeStoreSearch,
      ],
    },
    // Required e-mail verification (D64): no account for an unverified e-mail.
    {
      method: ['POST'],
      matcher: '/store/customers',
      middlewares: [requireVerifiedCustomer],
    },
  ],
})
