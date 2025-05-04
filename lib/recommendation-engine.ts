import { type Product, products } from "./product-database"

export interface UserProfile {
  skinType: string
  preferredIngredients: string[]
  avoidIngredients: string[]
  ageRange: string
  budget: string
  concerns?: string[]
  skinConditions?: string[]
}

interface ScoredProduct {
  product: Product
  score: number
  matchReasons: string[]
}

export class RecommendationEngine {
  private products: Product[]

  constructor(productDatabase: Product[] = products) {
    this.products = productDatabase
  }

  // Main recommendation function
  recommendProducts(
    userProfile: UserProfile,
    limit = 5,
  ): {
    products: Product[]
    matchReasons: Record<string, string[]>
  } {
    // Filter products based on hard constraints
    const filteredProducts = this.filterProducts(userProfile)

    // Score the remaining products
    const scoredProducts = this.scoreProducts(filteredProducts, userProfile)

    // Sort by score (highest first)
    const sortedProducts = scoredProducts.sort((a, b) => b.score - a.score)

    // Take the top products
    const topProducts = sortedProducts.slice(0, limit)

    // Create a map of product IDs to match reasons
    const matchReasons: Record<string, string[]> = {}
    topProducts.forEach(({ product, matchReasons: reasons }) => {
      matchReasons[product.id] = reasons
    })

    return {
      products: topProducts.map((p) => p.product),
      matchReasons,
    }
  }

  // Filter products based on hard constraints
  private filterProducts(userProfile: UserProfile): Product[] {
    return this.products.filter((product) => {
      // Filter by budget
      if (userProfile.budget !== "mixed") {
        if (userProfile.budget === "budget" && product.priceRange !== "budget") {
          return false
        }
        if (userProfile.budget === "mid-tier" && product.priceRange === "premium") {
          return false
        }
      }

      // Filter by avoided ingredients
      if (userProfile.avoidIngredients.length > 0) {
        const productIngredients = product.ingredients.map((i) => i.name.toLowerCase())
        const avoidIngredients = userProfile.avoidIngredients.map((i) => i.toLowerCase())

        if (
          avoidIngredients.some((ingredient) => productIngredients.some((prodIngr) => prodIngr.includes(ingredient)))
        ) {
          return false
        }
      }

      // Filter by skin conditions to avoid
      if (userProfile.skinConditions && userProfile.skinConditions.length > 0) {
        if (userProfile.skinConditions.some((condition) => product.avoidFor.conditions.includes(condition))) {
          return false
        }
      }

      return true
    })
  }

  // Score products based on user profile
  private scoreProducts(products: Product[], userProfile: UserProfile): ScoredProduct[] {
    return products.map((product) => {
      let score = 0
      const matchReasons: string[] = []

      // Score based on skin type match
      if (
        product.suitableFor.skinTypes.includes(userProfile.skinType) ||
        product.suitableFor.skinTypes.includes("All")
      ) {
        score += 30
        matchReasons.push(`Suitable for ${userProfile.skinType} skin`)
      } else if (!product.avoidFor.skinTypes.includes(userProfile.skinType)) {
        score += 10
      }

      // Score based on preferred ingredients
      const preferredIngredientsMatch = this.countIngredientMatches(
        product.keyIngredients,
        userProfile.preferredIngredients,
      )

      if (preferredIngredientsMatch > 0) {
        score += preferredIngredientsMatch * 15
        matchReasons.push(`Contains ${preferredIngredientsMatch} of your preferred ingredients`)
      }

      // Score based on age range
      if (
        product.suitableFor.ageRanges.includes(userProfile.ageRange) ||
        product.suitableFor.ageRanges.includes("All")
      ) {
        score += 20
        matchReasons.push(`Recommended for your age range`)
      }

      // Score based on concerns
      if (userProfile.concerns && userProfile.concerns.length > 0) {
        const concernMatches = userProfile.concerns.filter((concern) =>
          product.suitableFor.concerns.includes(concern),
        ).length

        if (concernMatches > 0) {
          score += concernMatches * 25
          matchReasons.push(`Addresses ${concernMatches} of your skin concerns`)
        }
      }

      // Score based on product rating
      score += product.averageRating * 5

      // Bonus for budget match
      if (userProfile.budget === product.priceRange) {
        score += 15
        matchReasons.push(`Fits your budget preference`)
      }

      return { product, score, matchReasons }
    })
  }

  // Helper function to count ingredient matches
  private countIngredientMatches(productIngredients: string[], userPreferredIngredients: string[]): number {
    const normalizedProductIngredients = productIngredients.map((i) => i.toLowerCase())
    const normalizedUserIngredients = userPreferredIngredients.map((i) => i.toLowerCase())

    return normalizedUserIngredients.filter((ingredient) =>
      normalizedProductIngredients.some((prodIngr) => prodIngr.includes(ingredient)),
    ).length
  }

  // Generate a complete skincare routine
  generateRoutine(userProfile: UserProfile): {
    morningRoutine: Product[]
    nightRoutine: Product[]
  } {
    // Categories needed for a complete routine
    const morningCategories = ["Cleanser", "Toner", "Serum", "Moisturizer", "Sunscreen"]
    const nightCategories = ["Cleanser", "Toner", "Serum", "Moisturizer"]

    // Get recommendations for each category
    const morningRoutine: Product[] = []
    const nightRoutine: Product[] = []

    // Morning routine
    for (const category of morningCategories) {
      const categoryProducts = this.products.filter((p) => p.category === category)
      const recommendations = this.recommendProducts({ ...userProfile }, 1)

      if (recommendations.products.length > 0) {
        morningRoutine.push(recommendations.products[0])
      }
    }

    // Night routine
    for (const category of nightCategories) {
      // For night, prefer products with "night" in the name or description
      const categoryProducts = this.products.filter(
        (p) =>
          p.category === category &&
          (p.name.toLowerCase().includes("night") || p.description.toLowerCase().includes("night")),
      )

      // If no night-specific products, use regular ones
      const productsToConsider =
        categoryProducts.length > 0 ? categoryProducts : this.products.filter((p) => p.category === category)

      const recommendations = this.recommendProducts({ ...userProfile }, 1)

      if (recommendations.products.length > 0) {
        nightRoutine.push(recommendations.products[0])
      }
    }

    return { morningRoutine, nightRoutine }
  }
}

// Helper function to convert budget string to enum
export function mapBudgetToRange(budget: string): "budget" | "mid-tier" | "premium" | "mixed" {
  switch (budget) {
    case "budget":
      return "budget"
    case "mid-tier":
      return "mid-tier"
    case "premium":
      return "premium"
    case "mixed":
    default:
      return "mixed"
  }
}

// Helper function to map skin concerns based on skin type and age
export function inferSkinConcerns(skinType: string, ageRange: string): string[] {
  const concerns: string[] = []

  // Add concerns based on skin type
  switch (skinType) {
    case "Oily":
      concerns.push("Excess oil", "Large pores", "Acne")
      break
    case "Dry":
      concerns.push("Dryness", "Flakiness", "Fine lines")
      break
    case "Combination":
      concerns.push("Excess oil", "Dryness", "Uneven texture")
      break
    case "Sensitive":
      concerns.push("Sensitivity", "Redness", "Irritation")
      break
    case "Normal":
      concerns.push("Maintenance", "Prevention")
      break
    default:
      concerns.push("General care")
  }

  // Add concerns based on age range
  switch (ageRange) {
    case "under-18":
      concerns.push("Acne", "Oil control")
      break
    case "18-24":
      concerns.push("Acne", "Hydration", "Prevention")
      break
    case "25-34":
      concerns.push("Early aging", "Fine lines", "Prevention")
      break
    case "35-44":
      concerns.push("Anti-aging", "Wrinkles", "Firmness")
      break
    case "45-54":
      concerns.push("Anti-aging", "Wrinkles", "Loss of elasticity")
      break
    case "55-plus":
      concerns.push("Deep wrinkles", "Sagging", "Age spots")
      break
    default:
      concerns.push("General care")
  }

  // Remove duplicates
  return [...new Set(concerns)]
}
