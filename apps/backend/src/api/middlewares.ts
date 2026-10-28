import {
  configureStoreSearch,
  defineMiddlewares,
  validateAndTransformBody,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from '@medusajs/framework/http'
import { MedusaError } from '@medusajs/framework/utils'

import { confirmVerificationAgain } from './auth/verification-again'
import { StoreCreateCustomerReturn, StoreRequestOrderClaim } from './store/customers/me/validators'
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
    // W5: a verification link opened twice answers as it did the first time.
    {
      method: ['POST'],
      matcher: '/auth/verification/confirm',
      middlewares: [confirmVerificationAgain],
    },
    // T53: a signed-in customer's claim of a guest order and return from their own order.
    // `/store/customers/me*` is authenticated by Medusa's own middleware.
    {
      method: ['POST'],
      matcher: '/store/customers/me/order-transfers',
      middlewares: [validateAndTransformBody(StoreRequestOrderClaim)],
    },
    {
      method: ['POST'],
      matcher: '/store/customers/me/returns',
      middlewares: [validateAndTransformBody(StoreCreateCustomerReturn)],
    },
    // Medusa's own return route answers anyone who has an order's id (SPEC §11.1); returns go
    // through `/store/customers/me/returns`, which checks the order is the customer's.
    {
      method: ['POST'],
      matcher: '/store/returns',
      middlewares: [closedRoute],
    },
  ],
})

function closedRoute(_req: MedusaRequest, _res: MedusaResponse, _next: MedusaNextFunction) {
  throw new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    'Returns are requested from the account: POST /store/customers/me/returns.',
  )
}
