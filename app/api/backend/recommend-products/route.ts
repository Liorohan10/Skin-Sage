import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// Backend configuration
const PY_BACKEND = process.env.NEXT_PUBLIC_PY_BACKEND_URL || "http://127.0.0.1:8000"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    let transformedData = body

    // Check if data needs transformation (frontend wrapped format)
    if (body.responses) {
      const frontendData = body.responses
      transformedData = {
        age_group: frontendData.age,
        skin_type: frontendData.skinType === 'combination' ? 'Combination' : 
                   frontendData.skinType === 'oily' ? 'Oily' : 
                   frontendData.skinType === 'dry' ? 'Dry' : 
                   frontendData.skinType === 'sensitive' ? 'Sensitive' : 'Normal',
        skin_concerns: frontendData.skinConcerns?.map((concern: string) => 
          concern === 'acne' ? 'Acne' :
          concern === 'dark_spots' ? 'Dark Spots' :
          concern === 'wrinkles' ? 'Anti-Aging' :
          concern === 'dullness' ? 'Brightening' : concern),
  // Send broad numeric ranges; backend will clamp to live max price and interpret tier
  price_range: frontendData.budget === 'budget' ? [400, 1700] :
    frontendData.budget === 'mid-tier' ? [1700, 4200] :
    frontendData.budget === 'premium' ? [4200, 999999] :
    frontendData.budget === 'mixed' ? [400, 999999] : [400, 4200],
  budget_tier: frontendData.budget,
        ingredients: frontendData.preferredIngredients || [],
        avoid_ingredients: frontendData.sensitivities || [],
        use_ai_enhancement: true
      }
      
      console.log("[Transform] Frontend wrapped data:", JSON.stringify(frontendData, null, 2))
      console.log("[Transform] Backend data:", JSON.stringify(transformedData, null, 2))
    } else {
      console.log("[Direct] Using direct questionnaire format:", JSON.stringify(transformedData, null, 2))
    }

    const res = await fetch(`${PY_BACKEND}/api/recommend-products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transformedData),
    })

    // Safely parse backend response; it may return HTML/text on 500
    const text = await res.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      console.error("[Proxy][recommend-products] Non-JSON response from backend:", text.slice(0, 500))
      return NextResponse.json({ error: 'Backend error', detail: text }, { status: res.status || 500 })
    }

    // Log key Gemini-driven fields to the Next.js dev terminal
    const routinePreview = JSON.stringify(data?.routine)?.slice(0, 1000)
    const analysisPreview = String(data?.skin_analysis || "").slice(0, 1000)

    console.log("[Gemini][recommend-products] routine preview:", routinePreview)
    console.log("[Gemini][recommend-products] skin_analysis (first 1k chars):", analysisPreview)

    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error("[Proxy][recommend-products] error:", err)
    return NextResponse.json({ error: "Proxy failed", detail: String(err) }, { status: 500 })
  }
}
