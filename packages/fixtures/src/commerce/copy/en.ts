import type { Copy } from "./types";

// US English. Colors are spelled the American way, and the store's tone is plain and warm.
export const en: Copy = {
  home: "Home",
  productTitles: {
    // 63 characters: the card's title wraps or clamps.
    "relaxed-fit-zip-hoodie": "Relaxed-Fit Organic Cotton Zip Hoodie with Ribbed Cuffs and Hem",
    "brushed-fleece-hoodie": "Brushed Fleece Hoodie",
    "garment-dyed-hoodie": "Garment-Dyed Pullover Hoodie",
    "essential-tee": "Essential Organic Cotton Tee",
    "fisherman-knit-sweater": "Fisherman Knit Sweater",
    "canvas-tote-bag": "Canvas Tote Bag",
    "organic-cotton-cap": "Organic Cotton Cap",
    "merino-ankle-socks": "Merino Ankle Socks, 3-Pack",
    "tapered-chino-trousers": "Tapered Chino Pants",
    "waxed-field-jacket": "Waxed Field Jacket",
    "ribbed-merino-turtleneck": "Ribbed Merino Turtleneck",
  },
  hoodieDetails:
    "The brushed inside keeps you warm without the bulk, and the double-lined hood holds its shape. Reinforced seams, ribbed cuffs and a kangaroo pocket finish the cut. Fits true to size; go up one size for a roomier fit.",
  customBadge: "Limited edition",
  categories: {
    women: "Women",
    men: "Men",
    accessories: "Accessories",
    clothing: "Clothing",
    bags: "Bags",
    headwear: "Headwear",
    socks: "Socks",
    hoodies: "Hoodies",
    "t-shirts": "T-shirts",
    knitwear: "Knitwear",
    jackets: "Jackets",
    trousers: "Pants",
    totes: "Totes",
    backpacks: "Backpacks",
    caps: "Caps",
    beanies: "Beanies",
    "ankle-socks": "Ankle socks",
    "crew-socks": "Crew socks",
  },
  colours: {
    white: "White",
    charcoal: "Charcoal",
    navy: "Navy",
    olive: "Olive",
    rust: "Rust",
    burgundy: "Burgundy",
    sand: "Sand",
  },
  options: { colour: "Color", size: "Size" },
  imageAlt: {
    front: (title) => `${title}, front view`,
    back: (title) => `${title}, back view`,
    detail: (title) => `${title}, close-up of the fabric`,
    colour: (title, colour) => `${title} in ${colour.toLowerCase()}`,
  },
  reviews: [
    {
      author: "Jordan P.",
      title: "My new favorite hoodie",
      body: "Soft on the inside, sturdy on the outside. I’ve washed it a dozen times and it still looks new. Fits true to size.",
    },
    {
      author: "Maya L.",
      title: "Great, but runs a little long",
      body: "I love the fabric and the color. The sleeves are a bit long for me, though, so if you’re between sizes, go with the smaller one.",
    },
    {
      author: "Chris T.",
      title: "Worth every cent",
      body: "The weight is just right for fall: warm without being heavy. The hood is properly lined and doesn’t flop.",
    },
    {
      author: "Sam R.",
      body: "Nice quality overall. The oatmeal is a little lighter than it looks in the photos.",
    },
    {
      author: "Priya N.",
      title: "Shrank in the wash",
      body: "Lovely at first, but after the first wash it came out noticeably shorter. Cold water and air-drying help, but I wish I had known sooner.",
    },
    {
      author: "Alex M.",
      title: "Perfect for layering",
      body: "I wear it under a jacket or on its own. The pocket is deep enough for my phone and keys.",
    },
  ],
  navigation: {
    newIn: "New in",
    sale: "Sale",
    discover: "Discover",
    bestsellers: "Bestsellers",
    giftCards: "Gift cards",
    organic: "Organic cotton",
    womenFeatures: [
      {
        title: "The autumn edit",
        alt: "A woman in an oatmeal hoodie and wide trousers walking through a park in autumn",
      },
      {
        title: "Knitwear weather",
        alt: "Folded chunky knit sweaters in oatmeal, navy and green on a wooden bench",
      },
    ],
    menFeatures: [
      {
        title: "Everyday essentials",
        alt: "A man in a plain tee and chinos leaning against a brick wall",
      },
    ],
  },
  footer: {
    shop: "Shop",
    help: "Help",
    company: "Company",
    shipping: "Shipping & returns",
    sizeGuide: "Size guide",
    contact: "Contact us",
    faq: "FAQ",
    trackOrder: "Track your order",
    about: "About us",
    sustainability: "Sustainability",
    careers: "Careers",
    stores: "Our stores",
    terms: "Terms & conditions",
    privacy: "Privacy policy",
    cookies: "Cookie policy",
    imprint: "Legal notice",
    copyright: (store, year) => `© ${year} ${store}. All rights reserved.`,
  },
  shipping: {
    standard: "Standard delivery",
    express: "Express delivery",
    free: "Free economy delivery",
    pickup: "Pick up in store",
    sameDay: "Same-day delivery",
    storeName: "Shopblok Store, Williamsburg",
  },
  card: "Credit or debit card",
  search: {
    query: "hoodie",
    categories: ["Women’s hoodies", "Men’s hoodies"],
    suggestions: ["hoodie with zip", "oversized hoodie", "organic cotton hoodie"],
  },
  facets: {
    category: "Category",
    colour: "Color",
    size: "Size",
    price: "Price",
    inStock: "In stock",
    onSale: "On sale",
  },
  activeFilters: { priceRange: (min, max) => `$${min} to $${max}` },
  announcement: { message: "Free shipping on orders over $165", link: "See details" },
  header: {
    announcements: [
      { message: "Free returns within 30 days", link: "How returns work" },
      { message: "New: the autumn collection in organic cotton", link: "Shop the collection" },
    ],
    longAnnouncement: {
      message:
        "Order by 2 pm on a weekday for same-day dispatch, and enjoy free returns within 30 days on every order",
      link: "Read our delivery and returns policy",
    },
    account: { signIn: "Sign in", orders: "Orders", wishlist: "Wishlist" },
    suggestionMessage: "Shop in your own country's store for local prices and delivery times.",
    heroAlt: "Folded knitwear in oatmeal and charcoal on a wooden bench",
  },
  figure: {
    alt: "A person in an oatmeal hoodie walking along a harbor wall at sunrise",
    caption: "The autumn collection, photographed on location by the harbor.",
    credit: "Shopblok Studio",
  },
  emptyStates: {
    filters: {
      title: "No products match these filters",
      text: "Try removing a filter or widening the price range.",
      action: "Clear all filters",
    },
    search: {
      title: "No results found",
      text: "Check the spelling or try a more general word.",
      action: "Browse the shop",
    },
    category: {
      title: "No products here yet",
      text: "New arrivals are on their way. Check back soon.",
    },
  },
  site: {
    faq: {
      items: [
        {
          title: "How long does delivery take?",
          answer: [
            "Most orders arrive in 2 to 4 working days. We email you a tracking link as soon as your parcel leaves our warehouse.",
            "Delivery is free once your order passes the free-shipping amount shown in your cart.",
          ],
        },
        {
          title: "Can I return an item?",
          answer: [
            "Yes. Unworn items in their original packaging can be returned within 30 days of delivery for a full refund.",
            "Start a return from your account, print the label and hand the parcel in at any collection point.",
          ],
        },
        {
          title: "How do I find my size?",
          answer: [
            "Every product page has a size guide with measurements in centimeters and inches.",
            "If you are between two sizes, take the larger one for a relaxed fit.",
          ],
        },
        {
          title: "Which payment methods do you accept?",
          answer: [
            "We accept the major credit and debit cards, Apple Pay, Google Pay, Revolut Pay, PayPal and Klarna.",
            "Your card details go straight to our payment provider. We never store them.",
          ],
        },
        {
          title: "How do I wash my hoodie?",
          answer: [
            "Machine wash cold with similar colors, turned inside out, and tumble dry on low.",
            "Do not bleach it, and do not iron the print.",
          ],
        },
      ],
      long: {
        title:
          "What happens to my order if one of the items sells out after I have already paid with a gift card and a discount code?",
        answer: [
          "If an item sells out before we pack your order, we email you the same day and offer a replacement in another size or color, a later delivery date, or a full refund of that item to the original payment methods.",
          "A gift card balance goes back onto the gift card, and a discount code stays valid for 14 days after the refund, so you can use it on a new order without paying a cent more than you would have before.",
        ],
      },
    },
    toasts: {
      success: {
        trigger: "Add to cart",
        title: "Added to cart",
        description: "Your item is waiting in your cart.",
        actionLabel: "Undo",
      },
      error: {
        trigger: "Apply code",
        title: "That code did not work",
        description: "Check the spelling, or the code may have expired.",
      },
      info: { trigger: "Check delivery", title: "Delivery takes 2 to 4 working days" },
      long: {
        trigger: "Place a large order",
        title: "Your order is placed, and the confirmation email is on its way to your inbox",
        description:
          "We will send the tracking link as soon as the parcel leaves our warehouse, which is usually within one working day.",
        actionLabel: "View your order details",
      },
    },
    cookieMessage:
      "Shopblok uses a few cookies to keep your cart and your country. If you agree, we also count visits and tailor our offers to you.",
  },
  checkoutFlow: {
    cart: "Cart",
    contact: "Contact and address",
    delivery: "Delivery",
    deliveryAndPayment: "Delivery and payment",
    payment: "Payment",
    review: "Review",
    long: [
      "Contact details and delivery address for your order",
      "Choose how your order is delivered to you",
      "Payment method and billing address details",
      "Review your order and place it",
    ],
  },
  long: {
    productTitle:
      "Heritage Hoodie in Brushed Organic Cotton Fleece with Reinforced Seams, Double-Lined Hood, Kangaroo Pocket and Matching Ribbed Cuffs, Limited Autumn Edition",
    badge: "Limited autumn edition while supplies last",
    cartLine: {
      title:
        "Heritage Hoodie in Brushed Organic Cotton Fleece with Reinforced Seams and Double-Lined Hood, Limited Autumn Edition",
      options: [
        {
          option: "Color and finish",
          value: "Heritage oatmeal with contrast stitching and tonal flat drawcords",
        },
        {
          option: "Size and fit",
          value: "Extra large, tall fit (adds two inches to the body length)",
        },
      ],
    },
    address: {
      firstName: "Alexandria-Josephine",
      lastName: "Montgomery-Featherstonehaugh",
      company:
        "Northside Independent Design, Architecture & Interiors Collective of Greater New York, LLC",
      address1: "4287 North Mockingbird Lane Extension, Building C, Entrance 2 (rear loading dock)",
      address2: "Suite 2100, attention: Accounts Payable and Receiving Department",
      city: "Mount Pleasant-on-the-Hudson",
      province: "NY",
      postalCode: "10001",
      phone: "+1 718 555 0199",
    },
    nav: {
      label: "Women’s clothing, accessories and seasonal collections",
      columns: [
        {
          title: "Everyday clothing for work, weekends and everything in between",
          links: [
            "Hoodies, sweatshirts and zip-through layers in organic cotton",
            "T-shirts, long sleeves and base layers for every season",
            "Knitwear, cardigans and chunky winter sweaters",
          ],
        },
        {
          title: "Bags, hats, socks and the small things that finish an outfit",
          links: [
            "Canvas totes, backpacks and weekend bags made to last",
            "Caps, beanies and scarves in wool and organic cotton",
            "Merino socks, tights and thermal underlayers",
          ],
        },
      ],
      feature: {
        title:
          "The autumn edit: eleven pieces to wear from the first cool morning to the first frost",
        alt: "A woman in an oatmeal hoodie and wide trousers walking through a park in autumn",
      },
    },
    footer: {
      title: "Customer care, delivery, returns and everything else you may want to know",
      links: [
        "Delivery times, shipping costs and tracking your parcel",
        "Returns, exchanges and how refunds are processed",
        "Our size guide with measurements and fit notes for every product",
        "Contact our customer care team by phone, chat or email",
        "Frequently asked questions about orders, payments and your account",
      ],
    },
    review: {
      author: "Taylor B.",
      title: "A very thorough review after a full season of wear, washing and travel",
      body: [
        "I bought the Heritage Hoodie in oatmeal at the start of last fall and have worn it at least three times a week since, so this is a review of a full season rather than a first impression.",
        "First, the fit. I’m 5’10” and about 170 pounds, and a medium is exactly what I hoped for: roomy through the chest and shoulders without looking oversized, with sleeves that stop right at the wrist. The ribbed cuffs and hem have kept their shape through many washes.",
        "The fabric is the real story. The brushed inside has been soft from day one and has not pilled, even under a backpack strap, and the outside shows almost no wear at the elbows. I washed it cold and hung it to dry, and it shrank by less than half an inch in length.",
        "The hood is double-lined and stands up on its own, which is great in the wind and slightly annoying if you prefer a slouchy hood. The drawcords are flat and don’t twist, and the pocket is deep enough for a phone, keys and a pair of gloves.",
        "My only complaint is that I wish it came in more colors, because I would buy a second one tomorrow. Otherwise I have nothing but good things to say, and I recommend it to anyone who wants a hoodie that lasts.",
      ].join("\n\n"),
    },
    shippingName:
      "Express delivery to your door with a signature on receipt and tracking by text message",
  },
};
