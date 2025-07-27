import { fetchFilteredProducts, type SupabaseProduct } from './supabase'

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
  product: SupabaseProduct
  score: number
  matchReasons: string[]
}

export class SupabaseRecommendationEngine {
  // Main recommendation function using Supabase
  async recommendProducts(
    userProfile: UserProfile,
    limit = 5,
  ): Promise<{
    products: SupabaseProduct[]
    matchReasons: Record<string, string[]>
  }> {
    // Map budget to price range
    const priceRange = this.mapBudgetToRange(userProfile.budget)
    
    // Fetch filtered products from Supabase
    const products = await fetchFilteredProducts({
      skinTypes: [userProfile.skinType],
      concerns: userProfile.concerns || [],
      ageRange: userProfile.ageRange,
      priceRange,
      ingredients: userProfile.preferredIngredients,
      limit: limit * 3, // Fetch more products to score and filter
    })

    // Filter products based on hard constraints
    const filteredProducts = this.filterProducts(products, userProfile)

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
      products: topProducts.map(sp => sp.product),
      matchReasons,
    }
  }

  // Filter products based on hard constraints
  private filterProducts(products: SupabaseProduct[], userProfile: UserProfile): SupabaseProduct[] {
    return products.filter(product => {
      // Check if product is suitable for user's skin type
      if (!product.suitableFor.skinTypes.includes(userProfile.skinType)) {
        return false
      }

      // Check if product should be avoided for user's skin type
      if (product.avoidFor.skinTypes.includes(userProfile.skinType)) {
        return false
      }

      // Check for ingredients to avoid
      const hasAvoidIngredients = userProfile.avoidIngredients.some(ingredient =>
        product.keyIngredients.some(productIngredient =>
          productIngredient.toLowerCase().includes(ingredient.toLowerCase())
        )
      )
      if (hasAvoidIngredients) {
        return false
      }

      // Check age appropriateness
      if (product.suitableFor.ageRanges.length > 0 && 
          !product.suitableFor.ageRanges.includes(userProfile.ageRange)) {
        return false
      }

      return true
    })
  }

  // Score products based on user preferences
  private scoreProducts(products: SupabaseProduct[], userProfile: UserProfile): ScoredProduct[] {
    return products.map(product => {
      let score = 0
      const matchReasons: string[] = []

      // Base score from rating
      score += product.averageRating * 10

      // Skin type match (high priority)
      if (product.suitableFor.skinTypes.includes(userProfile.skinType)) {
        score += 50
        matchReasons.push(`Perfect for ${userProfile.skinType} skin`)
      }

      // Concerns match
      if (userProfile.concerns) {
        const concernMatches = userProfile.concerns.filter(concern =>
          product.suitableFor.concerns.includes(concern)
        )
        score += concernMatches.length * 25
        if (concernMatches.length > 0) {
          matchReasons.push(`Addresses your concerns: ${concernMatches.join(', ')}`)
        }
      }

      // Preferred ingredients match
      const ingredientMatches = userProfile.preferredIngredients.filter(ingredient =>
        product.keyIngredients.some(productIngredient =>
          productIngredient.toLowerCase().includes(ingredient.toLowerCase())
        )
      )
      score += ingredientMatches.length * 20
      if (ingredientMatches.length > 0) {
        matchReasons.push(`Contains preferred ingredients: ${ingredientMatches.join(', ')}`)
      }

      // Age range match
      if (product.suitableFor.ageRanges.includes(userProfile.ageRange)) {
        score += 15
        matchReasons.push(`Suitable for your age group`)
      }

      // Budget match
      const budgetRange = this.mapBudgetToRange(userProfile.budget)
      if (product.priceRange === budgetRange) {
        score += 30
        matchReasons.push(`Fits your budget preference`)
      }

      // Popular/highly rated bonus
      if (product.averageRating >= 4.5) {
        score += 10
        matchReasons.push(`Highly rated product`)
      }

      return { product, score, matchReasons }
    })
  }

  // Map budget string to price range
  private mapBudgetToRange(budget: string): string {
    switch (budget.toLowerCase()) {
      case 'budget':
        return 'budget'
      case 'mid-tier':
        return 'mid-tier'
      case 'premium':
        return 'premium'
      case 'mixed':
        return 'mid-tier' // Default to mid-tier for mixed
      default:
        return 'mid-tier'
    }
  }

  // Generate a basic skincare routine
  generateRoutine(userProfile: UserProfile, recommendedProducts: SupabaseProduct[]): {
    morningRoutine: SupabaseProduct[]
    nightRoutine: SupabaseProduct[]
  } {
    const cleansers = recommendedProducts.filter(p => p.category.toLowerCase().includes('cleanser'))
    const toners = recommendedProducts.filter(p => p.category.toLowerCase().includes('toner'))
    const serums = recommendedProducts.filter(p => p.category.toLowerCase().includes('serum'))
    const moisturizers = recommendedProducts.filter(p => p.category.toLowerCase().includes('moisturizer'))
    const sunscreens = recommendedProducts.filter(p => p.category.toLowerCase().includes('sunscreen'))

    const morningRoutine: SupabaseProduct[] = []
    const nightRoutine: SupabaseProduct[] = []

    // Morning routine
    if (cleansers.length > 0) morningRoutine.push(cleansers[0])
    if (toners.length > 0) morningRoutine.push(toners[0])
    if (serums.length > 0) morningRoutine.push(serums[0])
    if (moisturizers.length > 0) morningRoutine.push(moisturizers[0])
    if (sunscreens.length > 0) morningRoutine.push(sunscreens[0])

    // Night routine
    if (cleansers.length > 0) nightRoutine.push(cleansers[0])
    if (toners.length > 0) nightRoutine.push(toners[0])
    if (serums.length > 1) nightRoutine.push(serums[1]) // Different serum for night
    else if (serums.length > 0) nightRoutine.push(serums[0])
    if (moisturizers.length > 1) nightRoutine.push(moisturizers[1]) // Night moisturizer
    else if (moisturizers.length > 0) nightRoutine.push(moisturizers[0])

    return { morningRoutine, nightRoutine }
  }
}

// Utility function to infer skin concerns based on other factors
export function inferSkinConcerns(skinType: string, ageRange: string): string[] {
  const concerns: string[] = []

  // Age-based concerns
  if (ageRange === "25-34" || ageRange === "35-44") {
    concerns.push("Fine Lines", "Dark Spots")
  } else if (ageRange === "45-54" || ageRange === "55-plus") {
    concerns.push("Wrinkles", "Age Spots", "Loss of Firmness")
  } else if (ageRange === "18-24") {
    concerns.push("Acne", "Blackheads")
  }

  // Skin type-based concerns
  switch (skinType) {
    case "Oily":
      concerns.push("Excess Oil", "Large Pores", "Acne")
      break
    case "Dry":
      concerns.push("Dryness", "Flakiness", "Rough Texture")
      break
    case "Combination":
      concerns.push("Oily T-Zone", "Dry Cheeks", "Uneven Texture")
      break
    case "Sensitive":
      concerns.push("Redness", "Irritation", "Reactive Skin")
      break
  }

  return concerns
}

// Map budget to range helper
export function mapBudgetToRange(budget: string): string {
  switch (budget.toLowerCase()) {
    case 'budget':
      return 'budget'
    case 'mid-tier':
      return 'mid-tier'
    case 'premium':
      return 'premium'
    case 'mixed':
      return 'mid-tier'
    default:
      return 'mid-tier'
  }
}
