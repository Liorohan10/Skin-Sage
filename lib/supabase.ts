import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for products
export interface DatabaseProduct {
  id: number
  name: string
  brand: string
  category: string
  description: string
  price: number
  rating: number
  image_url: string
  ingredients: string[]
  key_ingredients: string[]
  suitable_for_skin_types: string[]
  suitable_for_concerns: string[]
  suitable_for_age_ranges: string[]
  avoid_for_skin_types: string[]
  avoid_for_concerns: string[]
  tags: string[]
  price_range: string
  size_ml: number
  created_at?: string
}

export interface SupabaseProduct {
  id: string
  name: string
  brand: string
  category: string
  description: string
  price: number
  priceRange: string
  size: number
  ingredients: string[]
  keyIngredients: string[]
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
  imageUrl: string
}

// Convert database product to our app format
export function convertDatabaseProduct(dbProduct: DatabaseProduct): SupabaseProduct {
  return {
    id: dbProduct.id.toString(),
    name: dbProduct.name,
    brand: dbProduct.brand,
    category: dbProduct.category,
    description: dbProduct.description,
    price: dbProduct.price,
    priceRange: dbProduct.price_range || 'mid-tier',
    size: dbProduct.size_ml || 50,
    ingredients: dbProduct.ingredients || [],
    keyIngredients: dbProduct.key_ingredients || [],
    suitableFor: {
      skinTypes: dbProduct.suitable_for_skin_types || [],
      concerns: dbProduct.suitable_for_concerns || [],
      ageRanges: dbProduct.suitable_for_age_ranges || [],
    },
    avoidFor: {
      skinTypes: dbProduct.avoid_for_skin_types || [],
      concerns: dbProduct.avoid_for_concerns || [],
      conditions: [],
    },
    tags: dbProduct.tags || [],
    averageRating: dbProduct.rating || 4.0,
    imageUrl: dbProduct.image_url || '/placeholder.jpg',
  }
}

// Fetch products from Supabase
export async function fetchProductsFromSupabase(): Promise<SupabaseProduct[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(100) // Limit to prevent excessive data

    if (error) {
      console.error('Error fetching products from Supabase:', error)
      return []
    }

    return data.map(convertDatabaseProduct)
  } catch (error) {
    console.error('Error in fetchProductsFromSupabase:', error)
    return []
  }
}

// Fetch products with filters for recommendations
export async function fetchFilteredProducts(filters: {
  skinTypes?: string[]
  concerns?: string[]
  ageRange?: string
  priceRange?: string
  ingredients?: string[]
  avoidIngredients?: string[]
  limit?: number
}): Promise<SupabaseProduct[]> {
  try {
    let query = supabase.from('products').select('*')

    // Apply filters
    if (filters.skinTypes && filters.skinTypes.length > 0) {
      query = query.overlaps('suitable_for_skin_types', filters.skinTypes)
    }

    if (filters.concerns && filters.concerns.length > 0) {
      query = query.overlaps('suitable_for_concerns', filters.concerns)
    }

    if (filters.priceRange) {
      query = query.eq('price_range', filters.priceRange)
    }

    if (filters.ingredients && filters.ingredients.length > 0) {
      query = query.overlaps('key_ingredients', filters.ingredients)
    }

    // Limit results
    if (filters.limit) {
      query = query.limit(filters.limit)
    } else {
      query = query.limit(50) // Default limit
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching filtered products from Supabase:', error)
      return []
    }

    return data.map(convertDatabaseProduct)
  } catch (error) {
    console.error('Error in fetchFilteredProducts:', error)
    return []
  }
}
