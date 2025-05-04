import { create } from "zustand"

interface ProductIngredient {
  name: string
  concentration?: number
  purpose: string
  benefitsFor: string[]
}

export interface Product {
  name: string
  description: string
  price: string
  ingredients: string
  suitableFor: string
  matchReasons?: string[]
}

export interface ResultsData {
  id: string
  skinConditionAnalysis: string
  recommendedProducts: Product[]
  morningRoutine: string
  nightRoutine: string
  skinCareAdvice?: string
  aiResponse: string
  userProfile?: {
    skinType: string
    preferredIngredients: string[]
    avoidIngredients: string[]
    ageRange: string
    budget: string
    concerns?: string[]
  }
}

interface ResultsStore {
  results: Map<string, ResultsData>
  addResult: (result: ResultsData) => void
  getResult: (id: string) => ResultsData | undefined
}

// Default result for testing
const defaultResult: ResultsData = {
  id: "default_result",
  skinConditionAnalysis:
    "Based on your information, you have combination skin with some oiliness in the T-zone and dryness on the cheeks. You may experience occasional breakouts and have some concerns about early signs of aging.",
  recommendedProducts: [
    {
      name: "Gentle Foaming Cleanser",
      description: "A pH-balanced cleanser that removes impurities without stripping the skin.",
      price: "$24.99",
      ingredients: "Glycerin, Amino Acid Surfactants, Panthenol",
      suitableFor: "Combination skin, sensitive skin",
      matchReasons: ["Suitable for combination skin", "Contains gentle cleansing agents", "pH-balanced formula"],
    },
    {
      name: "Niacinamide 10% Serum",
      description: "Helps regulate sebum production and minimize the appearance of pores.",
      price: "$19.99",
      ingredients: "Niacinamide, Zinc PCA, Glycerin, Panthenol",
      suitableFor: "Oily and combination skin",
      matchReasons: ["Contains niacinamide which helps control oil", "Addresses large pores", "Budget-friendly option"],
    },
    {
      name: "Hyaluronic Acid Serum",
      description: "Provides deep hydration without adding oil to the skin.",
      price: "$22.99",
      ingredients: "Sodium Hyaluronate, Glycerin, Panthenol",
      suitableFor: "All skin types, especially dehydrated skin",
      matchReasons: [
        "Provides hydration without oiliness",
        "Works well for combination skin",
        "Contains ingredients you prefer",
      ],
    },
  ],
  morningRoutine:
    "1. Cleanse with Gentle Foaming Cleanser\n2. Apply Niacinamide 10% Serum\n3. Apply Hyaluronic Acid Serum\n4. Apply Moisturizer\n5. Finish with Sunscreen",
  nightRoutine:
    "1. Double cleanse\n2. Apply Niacinamide 10% Serum\n3. Apply Hyaluronic Acid Serum\n4. Apply Moisturizer",
  skinCareAdvice:
    "Focus on balancing oil production in the T-zone while keeping the cheeks hydrated. Consider using a clay mask once a week on oily areas and a hydrating mask on dry areas.",
  aiResponse: "Default response for testing",
  userProfile: {
    skinType: "Combination",
    preferredIngredients: ["Hyaluronic Acid", "Niacinamide"],
    avoidIngredients: ["Fragrance", "Alcohol"],
    ageRange: "25-34",
    budget: "mid-tier",
    concerns: ["Oiliness", "Dryness", "Uneven texture"],
  },
}

// Create the store
export const useResultsStore = create<ResultsStore>((set, get) => ({
  results: new Map([["default_result", defaultResult]]),
  addResult: (result) =>
    set((state) => {
      const newResults = new Map(state.results)
      newResults.set(result.id, result)
      return { results: newResults }
    }),
  getResult: (id) => {
    const state = get()
    return state.results.get(id) || state.results.get("default_result")
  },
}))
