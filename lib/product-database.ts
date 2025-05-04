// Product database with detailed attributes for sophisticated matching

export interface ProductIngredient {
  name: string
  concentration?: number // Percentage if known
  purpose: string
  benefitsFor: string[]
}

export interface ProductReview {
  rating: number // 1-5
  skinType: string
  ageRange: string
  comment?: string
}

export interface Product {
  id: string
  name: string
  brand: string
  category: string
  description: string
  price: number // Store as number for calculations
  priceRange: "budget" | "mid-tier" | "premium"
  size: number // in ml or g
  ingredients: ProductIngredient[]
  keyIngredients: string[] // For quick matching
  suitableFor: {
    skinTypes: string[]
    concerns: string[]
    ageRanges: string[]
  }
  avoidFor: {
    skinTypes: string[]
    concerns: string[]
    conditions: string[]
  }
  tags: string[]
  averageRating: number
  reviews: ProductReview[]
  imageUrl: string
}

// Sample product database
export const products: Product[] = [
  {
    id: "p1",
    name: "Gentle Foaming Cleanser",
    brand: "SkinSage",
    category: "Cleanser",
    description: "A pH-balanced cleanser that removes impurities without stripping the skin.",
    price: 24.99,
    priceRange: "mid-tier",
    size: 150,
    ingredients: [
      {
        name: "Glycerin",
        concentration: 5,
        purpose: "Hydration",
        benefitsFor: ["Dry skin", "Dehydrated skin"],
      },
      {
        name: "Amino Acid Surfactants",
        purpose: "Gentle cleansing",
        benefitsFor: ["Sensitive skin", "All skin types"],
      },
      {
        name: "Panthenol",
        purpose: "Soothing",
        benefitsFor: ["Irritated skin", "Sensitive skin"],
      },
    ],
    keyIngredients: ["Glycerin", "Amino Acid Surfactants", "Panthenol"],
    suitableFor: {
      skinTypes: ["All", "Sensitive", "Combination", "Dry"],
      concerns: ["Dryness", "Sensitivity", "Dehydration"],
      ageRanges: ["All"],
    },
    avoidFor: {
      skinTypes: [],
      concerns: [],
      conditions: ["Open wounds"],
    },
    tags: ["Gentle", "Hydrating", "pH-balanced"],
    averageRating: 4.7,
    reviews: [
      {
        rating: 5,
        skinType: "Sensitive",
        ageRange: "25-34",
        comment: "Finally a cleanser that doesn't irritate my skin!",
      },
      {
        rating: 4,
        skinType: "Combination",
        ageRange: "35-44",
        comment: "Works well but I wish it removed makeup better.",
      },
    ],
    imageUrl: "/placeholder.svg?height=200&width=200",
  },
  {
    id: "p2",
    name: "Niacinamide 10% Serum",
    brand: "SkinSage",
    category: "Serum",
    description: "Helps regulate sebum production and minimize the appearance of pores.",
    price: 19.99,
    priceRange: "budget",
    size: 30,
    ingredients: [
      {
        name: "Niacinamide",
        concentration: 10,
        purpose: "Sebum regulation, pore reduction",
        benefitsFor: ["Oily skin", "Acne-prone skin", "Large pores"],
      },
      {
        name: "Zinc PCA",
        purpose: "Oil control",
        benefitsFor: ["Oily skin", "Acne-prone skin"],
      },
      {
        name: "Glycerin",
        purpose: "Hydration",
        benefitsFor: ["All skin types"],
      },
    ],
    keyIngredients: ["Niacinamide", "Zinc PCA", "Glycerin"],
    suitableFor: {
      skinTypes: ["Oily", "Combination", "Normal", "Acne-prone"],
      concerns: ["Excess oil", "Large pores", "Uneven texture", "Acne"],
      ageRanges: ["All"],
    },
    avoidFor: {
      skinTypes: ["Very dry"],
      concerns: ["Extreme dryness"],
      conditions: ["Niacinamide allergy"],
    },
    tags: ["Oil control", "Pore minimizing", "Brightening"],
    averageRating: 4.5,
    reviews: [
      {
        rating: 5,
        skinType: "Oily",
        ageRange: "18-24",
        comment: "My skin is so much less oily now!",
      },
      {
        rating: 4,
        skinType: "Combination",
        ageRange: "25-34",
        comment: "Helped with my pores but took a few weeks to see results.",
      },
    ],
    imageUrl: "/placeholder.svg?height=200&width=200",
  },
  {
    id: "p3",
    name: "Hyaluronic Acid Serum",
    brand: "SkinSage",
    category: "Serum",
    description: "Provides deep hydration without adding oil to the skin.",
    price: 22.99,
    priceRange: "mid-tier",
    size: 30,
    ingredients: [
      {
        name: "Sodium Hyaluronate",
        purpose: "Hydration",
        benefitsFor: ["All skin types", "Dehydrated skin"],
      },
      {
        name: "Glycerin",
        purpose: "Hydration",
        benefitsFor: ["All skin types"],
      },
      {
        name: "Panthenol",
        purpose: "Soothing",
        benefitsFor: ["Sensitive skin"],
      },
    ],
    keyIngredients: ["Sodium Hyaluronate", "Glycerin", "Panthenol"],
    suitableFor: {
      skinTypes: ["All", "Dehydrated", "Dry", "Combination", "Oily"],
      concerns: ["Dehydration", "Fine lines", "Dullness"],
      ageRanges: ["All"],
    },
    avoidFor: {
      skinTypes: [],
      concerns: [],
      conditions: [],
    },
    tags: ["Hydrating", "Plumping", "Anti-aging"],
    averageRating: 4.8,
    reviews: [
      {
        rating: 5,
        skinType: "Dry",
        ageRange: "35-44",
        comment: "My skin drinks this up! So hydrating!",
      },
      {
        rating: 5,
        skinType: "Combination",
        ageRange: "25-34",
        comment: "Perfect for dehydrated skin that's also acne-prone.",
      },
    ],
    imageUrl: "/placeholder.svg?height=200&width=200",
  },
  {
    id: "p4",
    name: "Vitamin C Brightening Serum",
    brand: "SkinSage",
    category: "Serum",
    description: "Antioxidant-rich serum that brightens skin and fades dark spots.",
    price: 38.99,
    priceRange: "premium",
    size: 30,
    ingredients: [
      {
        name: "Ascorbic Acid",
        concentration: 15,
        purpose: "Brightening, antioxidant",
        benefitsFor: ["Hyperpigmentation", "Dull skin", "Sun damage"],
      },
      {
        name: "Vitamin E",
        purpose: "Antioxidant, stabilizer",
        benefitsFor: ["All skin types"],
      },
      {
        name: "Ferulic Acid",
        purpose: "Antioxidant, stabilizer",
        benefitsFor: ["All skin types"],
      },
    ],
    keyIngredients: ["Ascorbic Acid", "Vitamin E", "Ferulic Acid"],
    suitableFor: {
      skinTypes: ["All", "Normal", "Combination", "Mature"],
      concerns: ["Hyperpigmentation", "Dullness", "Fine lines", "Sun damage"],
      ageRanges: ["25-34", "35-44", "45-54", "55-plus"],
    },
    avoidFor: {
      skinTypes: ["Very sensitive"],
      concerns: ["Active breakouts"],
      conditions: ["Vitamin C allergy"],
    },
    tags: ["Brightening", "Antioxidant", "Anti-aging"],
    averageRating: 4.6,
    reviews: [
      {
        rating: 5,
        skinType: "Normal",
        ageRange: "35-44",
        comment: "My dark spots are fading and my skin looks brighter!",
      },
      {
        rating: 4,
        skinType: "Combination",
        ageRange: "45-54",
        comment: "Good results but it took about a month to see changes.",
      },
    ],
    imageUrl: "/placeholder.svg?height=200&width=200",
  },
  {
    id: "p5",
    name: "Retinol Night Cream",
    brand: "SkinSage",
    category: "Moisturizer",
    description: "Anti-aging night cream that reduces fine lines and improves skin texture.",
    price: 45.99,
    priceRange: "premium",
    size: 50,
    ingredients: [
      {
        name: "Retinol",
        concentration: 0.5,
        purpose: "Cell turnover, anti-aging",
        benefitsFor: ["Aging skin", "Fine lines", "Uneven texture"],
      },
      {
        name: "Peptides",
        purpose: "Collagen support",
        benefitsFor: ["Aging skin", "Loss of firmness"],
      },
      {
        name: "Ceramides",
        purpose: "Barrier support",
        benefitsFor: ["All skin types", "Sensitive skin"],
      },
    ],
    keyIngredients: ["Retinol", "Peptides", "Ceramides"],
    suitableFor: {
      skinTypes: ["Normal", "Combination", "Dry", "Mature"],
      concerns: ["Fine lines", "Wrinkles", "Uneven texture", "Loss of firmness"],
      ageRanges: ["25-34", "35-44", "45-54", "55-plus"],
    },
    avoidFor: {
      skinTypes: ["Very sensitive"],
      concerns: ["Active breakouts", "Rosacea"],
      conditions: ["Pregnancy", "Retinoid allergy"],
    },
    tags: ["Anti-aging", "Resurfacing", "Overnight treatment"],
    averageRating: 4.7,
    reviews: [
      {
        rating: 5,
        skinType: "Normal",
        ageRange: "45-54",
        comment: "I've been using this for 3 months and my fine lines are much less noticeable!",
      },
      {
        rating: 4,
        skinType: "Dry",
        ageRange: "35-44",
        comment: "Works well but can be drying if not used with enough moisturizer.",
      },
    ],
    imageUrl: "/placeholder.svg?height=200&width=200",
  },
  {
    id: "p6",
    name: "Hydrating Gel Moisturizer",
    brand: "SkinSage",
    category: "Moisturizer",
    description: "Lightweight gel moisturizer that hydrates without clogging pores.",
    price: 28.99,
    priceRange: "mid-tier",
    size: 50,
    ingredients: [
      {
        name: "Hyaluronic Acid",
        purpose: "Hydration",
        benefitsFor: ["All skin types", "Dehydrated skin"],
      },
      {
        name: "Aloe Vera",
        purpose: "Soothing, hydration",
        benefitsFor: ["Sensitive skin", "Irritated skin"],
      },
      {
        name: "Cucumber Extract",
        purpose: "Cooling, soothing",
        benefitsFor: ["Oily skin", "Combination skin"],
      },
    ],
    keyIngredients: ["Hyaluronic Acid", "Aloe Vera", "Cucumber Extract"],
    suitableFor: {
      skinTypes: ["Oily", "Combination", "Normal", "Acne-prone"],
      concerns: ["Dehydration", "Oiliness", "Clogged pores"],
      ageRanges: ["All"],
    },
    avoidFor: {
      skinTypes: ["Very dry"],
      concerns: ["Extreme dryness"],
      conditions: [],
    },
    tags: ["Lightweight", "Oil-free", "Hydrating"],
    averageRating: 4.5,
    reviews: [
      {
        rating: 5,
        skinType: "Oily",
        ageRange: "18-24",
        comment: "Finally a moisturizer that doesn't make me break out!",
      },
      {
        rating: 4,
        skinType: "Combination",
        ageRange: "25-34",
        comment: "Great for summer but not quite enough in winter.",
      },
    ],
    imageUrl: "/placeholder.svg?height=200&width=200",
  },
  {
    id: "p7",
    name: "Rich Repair Night Cream",
    brand: "SkinSage",
    category: "Moisturizer",
    description: "Deeply nourishing night cream for dry and mature skin.",
    price: 32.99,
    priceRange: "mid-tier",
    size: 50,
    ingredients: [
      {
        name: "Shea Butter",
        purpose: "Moisturizing",
        benefitsFor: ["Dry skin", "Mature skin"],
      },
      {
        name: "Ceramides",
        purpose: "Barrier repair",
        benefitsFor: ["Dry skin", "Sensitive skin"],
      },
      {
        name: "Peptides",
        purpose: "Anti-aging",
        benefitsFor: ["Mature skin", "Fine lines"],
      },
    ],
    keyIngredients: ["Shea Butter", "Ceramides", "Peptides"],
    suitableFor: {
      skinTypes: ["Dry", "Very dry", "Mature", "Normal"],
      concerns: ["Dryness", "Fine lines", "Dullness", "Rough texture"],
      ageRanges: ["25-34", "35-44", "45-54", "55-plus"],
    },
    avoidFor: {
      skinTypes: ["Oily", "Acne-prone"],
      concerns: ["Clogged pores", "Excess oil"],
      conditions: [],
    },
    tags: ["Rich", "Nourishing", "Anti-aging"],
    averageRating: 4.6,
    reviews: [
      {
        rating: 5,
        skinType: "Dry",
        ageRange: "45-54",
        comment: "This cream saved my dry winter skin!",
      },
      {
        rating: 4,
        skinType: "Normal",
        ageRange: "35-44",
        comment: "Very moisturizing but takes a while to absorb.",
      },
    ],
    imageUrl: "/placeholder.svg?height=200&width=200",
  },
  {
    id: "p8",
    name: "Mineral Sunscreen SPF 50",
    brand: "SkinSage",
    category: "Sunscreen",
    description: "Broad-spectrum mineral sunscreen suitable for sensitive skin.",
    price: 32.99,
    priceRange: "mid-tier",
    size: 50,
    ingredients: [
      {
        name: "Zinc Oxide",
        concentration: 12,
        purpose: "UV protection",
        benefitsFor: ["All skin types", "Sensitive skin"],
      },
      {
        name: "Titanium Dioxide",
        concentration: 5,
        purpose: "UV protection",
        benefitsFor: ["All skin types", "Sensitive skin"],
      },
      {
        name: "Vitamin E",
        purpose: "Antioxidant",
        benefitsFor: ["All skin types"],
      },
    ],
    keyIngredients: ["Zinc Oxide", "Titanium Dioxide", "Vitamin E"],
    suitableFor: {
      skinTypes: ["All", "Sensitive", "Acne-prone", "Rosacea-prone"],
      concerns: ["Sun protection", "Sensitivity", "Hyperpigmentation"],
      ageRanges: ["All"],
    },
    avoidFor: {
      skinTypes: [],
      concerns: [],
      conditions: ["Zinc allergy"],
    },
    tags: ["Mineral", "Broad-spectrum", "Reef-safe"],
    averageRating: 4.3,
    reviews: [
      {
        rating: 5,
        skinType: "Sensitive",
        ageRange: "25-34",
        comment: "The only sunscreen that doesn't break me out!",
      },
      {
        rating: 3,
        skinType: "Dark",
        ageRange: "35-44",
        comment: "Good protection but leaves a white cast on my skin.",
      },
    ],
    imageUrl: "/placeholder.svg?height=200&width=200",
  },
  {
    id: "p9",
    name: "Salicylic Acid Exfoliating Toner",
    brand: "SkinSage",
    category: "Toner",
    description: "Clarifying toner that unclogs pores and smooths skin texture.",
    price: 18.99,
    priceRange: "budget",
    size: 120,
    ingredients: [
      {
        name: "Salicylic Acid",
        concentration: 2,
        purpose: "Exfoliation, pore clearing",
        benefitsFor: ["Oily skin", "Acne-prone skin", "Clogged pores"],
      },
      {
        name: "Witch Hazel",
        purpose: "Astringent, soothing",
        benefitsFor: ["Oily skin", "Combination skin"],
      },
      {
        name: "Aloe Vera",
        purpose: "Soothing",
        benefitsFor: ["Sensitive skin", "Irritated skin"],
      },
    ],
    keyIngredients: ["Salicylic Acid", "Witch Hazel", "Aloe Vera"],
    suitableFor: {
      skinTypes: ["Oily", "Combination", "Acne-prone"],
      concerns: ["Acne", "Blackheads", "Rough texture", "Large pores"],
      ageRanges: ["All"],
    },
    avoidFor: {
      skinTypes: ["Dry", "Very sensitive"],
      concerns: ["Extreme dryness", "Damaged barrier"],
      conditions: ["Salicylic acid allergy"],
    },
    tags: ["Exfoliating", "Clarifying", "Pore-clearing"],
    averageRating: 4.4,
    reviews: [
      {
        rating: 5,
        skinType: "Oily",
        ageRange: "18-24",
        comment: "My skin is so much clearer after using this!",
      },
      {
        rating: 4,
        skinType: "Combination",
        ageRange: "25-34",
        comment: "Works well but can be drying if used too often.",
      },
    ],
    imageUrl: "/placeholder.svg?height=200&width=200",
  },
  {
    id: "p10",
    name: "Hydrating Face Mask",
    brand: "SkinSage",
    category: "Mask",
    description: "Intensive hydrating mask for dry and dehydrated skin.",
    price: 24.99,
    priceRange: "mid-tier",
    size: 75,
    ingredients: [
      {
        name: "Hyaluronic Acid",
        purpose: "Hydration",
        benefitsFor: ["All skin types", "Dehydrated skin"],
      },
      {
        name: "Glycerin",
        purpose: "Hydration",
        benefitsFor: ["All skin types"],
      },
      {
        name: "Honey Extract",
        purpose: "Soothing, humectant",
        benefitsFor: ["Dry skin", "Irritated skin"],
      },
    ],
    keyIngredients: ["Hyaluronic Acid", "Glycerin", "Honey Extract"],
    suitableFor: {
      skinTypes: ["All", "Dry", "Dehydrated", "Normal", "Combination"],
      concerns: ["Dehydration", "Dryness", "Dullness", "Tightness"],
      ageRanges: ["All"],
    },
    avoidFor: {
      skinTypes: [],
      concerns: [],
      conditions: ["Honey allergy"],
    },
    tags: ["Hydrating", "Soothing", "Plumping"],
    averageRating: 4.7,
    reviews: [
      {
        rating: 5,
        skinType: "Dry",
        ageRange: "25-34",
        comment: "My skin feels so plump and hydrated after using this!",
      },
      {
        rating: 5,
        skinType: "Dehydrated",
        ageRange: "35-44",
        comment: "Perfect for when my skin needs an extra boost of hydration.",
      },
    ],
    imageUrl: "/placeholder.svg?height=200&width=200",
  },
]
