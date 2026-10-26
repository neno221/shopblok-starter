// Store API answers for the data layer's tests, in the shape Medusa 2.21.2 sent them on the dev
// stack with the demo catalog (T47 read them with curl: `/store/products` with the detail fields,
// a cart after an add, `/store/product-categories`), cut to the fields the data layer reads and
// with one case each the demo lacks (a sale price, tracked stock, a picture, a nested category).
import type { WireCart } from "../lib/medusa/cart";
import type { WireCategory } from "../lib/medusa/categories";
import type { WireProduct } from "../lib/medusa/products";

const price = (calculated: number, original = calculated, currency = "eur") => ({
  calculated_amount: calculated,
  original_amount: original,
  currency_code: currency,
});

const COLOUR = "opt_colour";
const SIZE = "opt_size";

/** A hoodie in two colours and two sizes: one variant on sale, one low, one sold out. */
export const wireHoodie: WireProduct = {
  id: "prod_hoodie",
  handle: "demo-heritage-hoodie",
  title: "Φούτερ με κουκούλα Heritage",
  subtitle: null,
  description: "Βαρύ φούτερ με κουκούλα και βουρτσισμένη φλις επένδυση.",
  thumbnail: "https://cdn.example.com/hoodie.jpg",
  collection_id: "pcol_basics",
  images: [
    { id: "img_1", url: "https://cdn.example.com/hoodie.jpg" },
    { id: "img_2", url: "https://cdn.example.com/hoodie-back.jpg" },
  ],
  options: [
    {
      id: COLOUR,
      title: "Χρώμα",
      values: [
        { id: "optval_black", value: "Μαύρο" },
        { id: "optval_navy", value: "Μπλε" },
      ],
    },
    {
      id: SIZE,
      title: "Μέγεθος",
      values: [
        { id: "optval_s", value: "S" },
        { id: "optval_m", value: "M" },
      ],
    },
  ],
  variants: [
    {
      id: "variant_black_s",
      title: "S / Black",
      sku: "HOODIE-S-BLACK",
      manage_inventory: false,
      options: [
        { id: "optval_s", option_id: SIZE },
        { id: "optval_black", option_id: COLOUR },
      ],
      calculated_price: price(59),
    },
    {
      id: "variant_black_m",
      title: "M / Black",
      sku: "HOODIE-M-BLACK",
      manage_inventory: true,
      inventory_quantity: 3,
      options: [
        { id: "optval_m", option_id: SIZE },
        { id: "optval_black", option_id: COLOUR },
      ],
      calculated_price: price(49, 59),
    },
    {
      id: "variant_navy_s",
      title: "S / Navy",
      sku: "HOODIE-S-NAVY",
      manage_inventory: true,
      inventory_quantity: 0,
      allow_backorder: false,
      options: [
        { id: "optval_s", option_id: SIZE },
        { id: "optval_navy", option_id: COLOUR },
      ],
      calculated_price: price(59),
    },
  ],
  categories: [{ id: "pcat_apparel", handle: "apparel", name: "Ρούχα" }],
  tags: [],
};

/** A mug with one variant and no picture: the demo catalog's usual case. */
export const wireMug: WireProduct = {
  id: "prod_mug",
  handle: "demo-ceramic-mug",
  title: "Κεραμική κούπα",
  description: "",
  thumbnail: null,
  images: [],
  options: [
    { id: "opt_mug_colour", title: "Χρώμα", values: [{ id: "optval_white", value: "Λευκό" }] },
  ],
  variants: [
    {
      id: "variant_mug",
      title: "White",
      sku: "MUG-WHITE",
      manage_inventory: false,
      options: [{ id: "optval_white", option_id: "opt_mug_colour" }],
      calculated_price: price(14),
    },
  ],
  categories: [{ id: "pcat_home", handle: "home", name: "Σπίτι" }],
  tags: [{ id: "ptag_gift" }],
};

/** A cart after two adds, with a 10 % code on the hoodie. */
export const wireCart: WireCart = {
  id: "cart_1",
  region_id: "reg_eu",
  locale: "el-GR",
  currency_code: "eur",
  email: null,
  completed_at: null,
  item_subtotal: 112,
  discount_total: 4.9,
  shipping_total: 0,
  tax_total: 0,
  total: 107.1,
  items: [
    {
      id: "cali_hoodie",
      product_id: "prod_hoodie",
      product_handle: "demo-heritage-hoodie",
      variant_id: "variant_black_m",
      title: "Φούτερ με κουκούλα Heritage",
      product_title: "Φούτερ με κουκούλα Heritage",
      thumbnail: null,
      quantity: 2,
      unit_price: 49,
      compare_at_unit_price: 59,
      total: 93.1,
      adjustments: [{ code: "WELCOME10", amount: 4.9 }],
    },
    {
      id: "cali_mug",
      product_id: "prod_mug",
      product_handle: "demo-ceramic-mug",
      variant_id: "variant_mug",
      title: "Κεραμική κούπα",
      product_title: "Κεραμική κούπα",
      thumbnail: null,
      quantity: 1,
      unit_price: 14,
      compare_at_unit_price: null,
      total: 14,
      adjustments: [],
    },
  ],
  promotions: [{ code: "WELCOME10" }],
  shipping_methods: [],
  shipping_address: null,
};

/** A two-level tree, flat as the Store API answers it, out of rank order. */
export const wireCategories: WireCategory[] = [
  { id: "pcat_home", handle: "home", name: "Σπίτι", rank: 2, parent_category_id: null },
  {
    id: "pcat_tops",
    handle: "tops",
    name: "Μπλούζες",
    rank: 1,
    parent_category_id: "pcat_apparel",
  },
  { id: "pcat_apparel", handle: "apparel", name: "Ρούχα", rank: 0, parent_category_id: null },
  {
    id: "pcat_knit",
    handle: "knitwear",
    name: "Πλεκτά",
    rank: 0,
    parent_category_id: "pcat_apparel",
  },
  {
    id: "pcat_orphan",
    handle: "orphan",
    name: "Χωρίς γονέα",
    rank: 3,
    parent_category_id: "pcat_hidden",
  },
];
