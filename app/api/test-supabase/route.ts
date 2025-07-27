import { NextRequest, NextResponse } from "next/server"
import { fetchProductsFromSupabase } from "@/lib/supabase"

export async function GET() {
  try {
    const products = await fetchProductsFromSupabase()
    return NextResponse.json({ 
      message: "Supabase connection successful", 
      productCount: products.length,
      sampleProducts: products.slice(0, 3).map(p => ({ 
        name: p.name, 
        brand: p.brand, 
        price: p.price 
      }))
    })
  } catch (error) {
    console.error("Error testing Supabase connection:", error)
    return NextResponse.json(
      { error: "Failed to connect to Supabase", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
