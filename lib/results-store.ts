import { create } from "zustand"
import { persist } from "zustand/middleware"

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

// Advanced structure for Skin-Sage (supports both simple and complex data)
export interface ResultsData {
  id: string
  // Legacy/simple format (for compatibility)
  skinConditionAnalysis?: string
  recommendedProducts?: Product[]
  morningRoutine?: string
  nightRoutine?: string
  skinCareAdvice?: string
  aiResponse?: string
  
  // Advanced format (new Skin-Sage features)
  recommendations?: any[]
  routine?: {
    morning?: any[]
    evening?: any[]
    weekly?: any[]
  }
  skin_analysis?: {
    consultation?: string
  }
  analysis?: any
  
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
  results: Record<string, ResultsData>
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
      description: "A gentle, sulfate-free cleanser that removes impurities without stripping the skin.",
      price: "₹899",
      ingredients: "Salicylic Acid, Niacinamide, Hyaluronic Acid",
      suitableFor: "All skin types, especially combination and oily skin",
      matchReasons: ["Contains Niacinamide for oil control", "Gentle formula for sensitive areas"]
    },
    {
      name: "Hydrating Serum",
      description: "A lightweight serum that provides deep hydration without feeling heavy.",
      price: "₹1,299",
      ingredients: "Hyaluronic Acid, Vitamin B5, Ceramides",
      suitableFor: "Dry to combination skin",
      matchReasons: ["Hyaluronic Acid for hydration", "Won't clog pores"]
    }
  ],
  morningRoutine: "1. Gentle Cleanser\n2. Hydrating Serum\n3. Moisturizer\n4. Sunscreen SPF 30+",
  nightRoutine: "1. Gentle Cleanser\n2. Treatment Serum\n3. Night Moisturizer",
  skinCareAdvice: "Stay consistent with your routine, introduce new products gradually, and always patch test.",
  aiResponse: "Based on your profile, focus on maintaining skin balance with gentle, effective products.",
  userProfile: {
    skinType: "Combination",
    preferredIngredients: ["Niacinamide", "Hyaluronic Acid"],
    avoidIngredients: ["Alcohol", "Fragrance"],
    ageRange: "25-34",
    budget: "mid-tier",
    concerns: ["Oiliness", "Dryness", "Uneven texture"],
  },
}

// Create the store with persistence
export const useResultsStore = create<ResultsStore>()(
  persist(
    (set, get) => ({
      results: { default_result: defaultResult },
      addResult: (result) => {
        console.log("Adding result to store:", result);
        set((state) => ({
          results: { ...state.results, [result.id]: result }
        }));
      },
      getResult: (id) => {
        const result = get().results[id] || get().results["default_result"];
        console.log(`Getting result for ID ${id}:`, result ? "Found" : "Not found");
        console.log("All stored results:", Object.keys(get().results));
        return result;
      },
    }),
    {
      name: "skinsage-results-storage",
      // Use the native sessionStorage interface (strings) so zustand/persist
      // can handle serialization consistently. Avoid double-json encoding.
      storage: {
        // Note: zustand/persist expects StorageValue types. We cast to any to
        // keep the runtime behavior (raw strings) while satisfying TS.
        getItem: (name) => sessionStorage.getItem(name) as unknown as any,
        setItem: (name, value) => sessionStorage.setItem(name, value as unknown as string),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
    }
  )
)
