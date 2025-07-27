import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "")

export async function POST(request: NextRequest) {
  try {
    const { testImageAnalysis, userProfile } = await request.json()

    // Sample user profile for testing
    const sampleProfile = userProfile || {
      skinType: "Combination",
      preferredIngredients: ["Niacinamide", "Hyaluronic Acid"],
      avoidIngredients: ["Alcohol", "Fragrance"],
      ageRange: "25-34",
      budget: "mid-tier",
      concerns: ["Acne", "Dark Spots", "Oily T-Zone"]
    }

    console.log("🧪 Testing hybrid system: Python Backend + Gemini AI")

    // Test Python backend connection
    const recommendationPayload = {
      age_group: sampleProfile.ageRange,
      skin_concerns: sampleProfile.concerns,
      skin_type: sampleProfile.skinType,
      price_range: [500, 2000], // mid-tier range
      ingredients: sampleProfile.preferredIngredients,
      avoid_ingredients: sampleProfile.avoidIngredients,
    }

    console.log("📊 Testing Python backend connection...")
    const backendRes = await fetch("http://127.0.0.1:8000/api/recommend-products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recommendationPayload),
    })

    let backendSuccess = false
    let backendRecommendations = null
    let backendError = null

    if (backendRes.ok) {
      backendRecommendations = await backendRes.json()
      backendSuccess = true
      console.log("✅ Backend connected successfully")
    } else {
      backendError = `Backend error: ${backendRes.status}`
      console.log("❌ Backend connection failed")
    }

    // Test Gemini AI if requested
    let geminiResponse = null
    let geminiError = null

    if (!testImageAnalysis) {
      try {
        console.log("🤖 Testing Gemini AI integration...")
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" })
        
        const prompt = `You are a dermatologist. Analyze this skin profile: ${sampleProfile.skinType} skin, age ${sampleProfile.ageRange}, concerns: ${sampleProfile.concerns.join(", ")}. Provide a brief analysis in JSON format: {"analysis": "brief skin analysis", "advice": "quick advice"}`
        
        const result = await model.generateContent(prompt)
        geminiResponse = result.response.text()
        console.log("✅ Gemini AI working")
      } catch (error) {
        geminiError = String(error)
        console.log("❌ Gemini AI error:", error)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Hybrid system test completed",
      
      pythonBackend: {
        connected: backendSuccess,
        error: backendError,
        recommendations: backendRecommendations?.recommendations?.length || 0,
        sampleProducts: backendRecommendations?.recommendations?.slice(0, 3).map((p: any) => ({
          name: p.name,
          brand: p.brand,
          price: p.price,
          category: p.category
        })) || []
      },
      
      geminiAI: {
        tested: !testImageAnalysis,
        working: !!geminiResponse && !geminiError,
        error: geminiError,
        response: geminiResponse ? "AI analysis completed" : "Not tested"
      },
      
      pythonBackendProducts: backendRecommendations?.recommendations?.length || 0,
      
      testProfile: sampleProfile,
      
      hybridSystemStatus: backendSuccess ? "✅ Ready for production" : "❌ Backend issues detected"
    })

  } catch (error) {
    console.error("Error in demo endpoint:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Demo endpoint error", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
}
