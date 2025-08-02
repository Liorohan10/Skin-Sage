import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"
import { storeResults } from "../results/[id]/route"
import { fileToBase64 } from "@/lib/image-utils"

// Initialize the Google Generative AI with the API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "")

// Python backend URL
const PYTHON_BACKEND_URL = "http://127.0.0.1:8000"

// Helper function to convert budget string to price range
function budgetToPriceRange(budgetStr: string): [number, number] {
  switch (budgetStr) {
    case "budget": return [0, 500]
    case "mid-tier": return [500, 1500]
    case "premium": return [1500, 5000]
    case "mixed": return [0, 5000]
    default: return [0, 5000]
  }
}

// Utility function to infer skin concerns
function inferSkinConcerns(skinType: string, ageRange: string): string[] {
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Extract data from form
    const skinType = formData.get("skinType") as string
    const preferredIngredientsRaw = formData.get("preferredIngredients") as string
    const avoidIngredientsRaw = formData.get("avoidIngredients") as string
    const ageRange = formData.get("ageRange") as string
    const budget = formData.get("budget") as string
    const skinConcernsRaw = (formData.get("skinConcerns") as string) || "[]"

    // Validate required fields
    if (!skinType || !preferredIngredientsRaw || !avoidIngredientsRaw || !ageRange || !budget) {
      return NextResponse.json({ error: "Missing required fields in the form data" }, { status: 400 })
    }

    // Parse JSON strings safely
    let preferredIngredients: string[] = []
    let avoidIngredients: string[] = []
    let skinConcerns: string[] = []

    try {
      preferredIngredients = JSON.parse(preferredIngredientsRaw)
      avoidIngredients = JSON.parse(avoidIngredientsRaw)
      skinConcerns = JSON.parse(skinConcernsRaw)
    } catch (error) {
      console.error("Error parsing JSON:", error)
      return NextResponse.json({ error: "Invalid JSON format for ingredients or concerns" }, { status: 400 })
    }

    // If no skin concerns were provided, infer them
    if (skinConcerns.length === 0) {
      skinConcerns = inferSkinConcerns(skinType, ageRange)
    }

    // Create a unique ID for this analysis
    const analysisId = `rec_${Date.now()}`

    // Initialize backend data variables
    let backendRecommendations = null
    let backendRoutine = null
    let acneDetections = []
    let imageAnalysisInsights = ""
    
    // Handle image upload and analysis
    const faceImage = formData.get("faceImage") as File | null
    let imageBase64 = ""
    let imageMimeType = ""
    
    if (faceImage) {
      try {
        console.log("Processing uploaded image for analysis...")
        imageBase64 = await fileToBase64(faceImage)
        imageMimeType = faceImage.type
        
        // Try to get acne detection from Python backend
        try {
          const imageFormData = new FormData()
          imageFormData.append('file', faceImage)
          
          const acneResponse = await fetch(`${PYTHON_BACKEND_URL}/api/detect-skin-issues`, {
            method: 'POST',
            body: imageFormData,
          })
          
          if (acneResponse.ok) {
            const acneData = await acneResponse.json()
            acneDetections = acneData.detections || []
            console.log(`Detected ${acneDetections.length} skin issues`)
          }
        } catch (acneError) {
          console.error("Acne detection failed:", acneError)
        }
      } catch (imageError) {
        console.error("Error processing image:", imageError)
      }
    }

    // Get recommendations from Python backend
    try {
      console.log("Attempting to fetch products from Python backend (Supabase)...")
      
      // Convert budget to price range
      const priceRange = budgetToPriceRange(budget)
      
      // Format request data for backend
      const backendRequestData = {
        age_group: ageRange,
        skin_concerns: skinConcerns,
        skin_type: skinType,
        price_range: priceRange,
        ingredients: preferredIngredients,
        avoid_ingredients: avoidIngredients,
        use_ai_enhancement: true,
        acne_detections: acneDetections
      }
      
      console.log("Backend request data:", backendRequestData)
      
      // Send request to Python backend
      const backendResponse = await fetch(`${PYTHON_BACKEND_URL}/api/recommend-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendRequestData),
      })
      
      if (backendResponse.ok) {
        const backendData = await backendResponse.json()
        console.log("Successfully fetched backend data")
        
        // Store backend data
        backendRecommendations = backendData.products || backendData.recommendations || []
        backendRoutine = backendData.routine || null
        imageAnalysisInsights = backendData.skin_analysis || ""
        
        console.log("Backend products count:", backendRecommendations.length)
      } else {
        console.error("Backend error:", backendResponse.status, await backendResponse.text())
      }
    } catch (backendError) {
      console.error("Failed to fetch from backend:", backendError)
    }
    
    try {
      // Configure the model - using Gemini 2.5 Pro for enhanced capabilities
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      })

      // Enhanced prompt for comprehensive analysis
      const prompt = `
        You are a board-certified dermatologist providing a comprehensive skin consultation. Analyze the patient's profile and provide professional insights.

        User Profile:
        - Skin Type: ${skinType}
        - Age Range: ${ageRange}
        - Budget: ${budget}
        - Skin Concerns: ${skinConcerns.join(", ")}
        - Preferred Ingredients: ${preferredIngredients.join(", ")}
        - Ingredients to Avoid: ${avoidIngredients.join(", ")}
        ${acneDetections.length > 0 ? `\n- Detected Skin Issues: ${acneDetections.length} areas of concern identified` : ''}
        ${imageAnalysisInsights ? `\n- Backend Analysis: ${imageAnalysisInsights}` : ''}

        ${faceImage ? 'I am also providing a facial image for visual analysis. Please examine the image for visible skin conditions, texture, tone, and any concerns that can be observed.' : ''}

        Provide a detailed analysis in the following JSON format:
        {
          "skinConditionAnalysis": "Comprehensive analysis including visual observations if image provided, skin type assessment, concern evaluation, and professional insights",
          "skinCareAdvice": "Additional personalized advice including lifestyle recommendations, frequency of product use, what to expect during the adjustment period, and when to see results."
        }
      `

      // Create parts array for the model input
      const parts: any[] = [{ text: prompt }]

      // Add image to analysis if provided
      if (faceImage) {
        parts.push({
          inlineData: {
            mimeType: imageMimeType,
            data: imageBase64,
          },
        })
      }

      // Generate content with Gemini
      const result = await model.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      })

      const response = result.response
      const responseText = response.text()
      
      console.log("Raw Gemini response length:", responseText.length)
      console.log("Response starts with:", responseText.substring(0, 100))

      // Try to parse the JSON response from Gemini
      let parsedResponse
      try {
        // Extract JSON from the response (it might be wrapped in markdown code blocks)
        let cleanedResponse = responseText.trim()
        
        // Remove markdown code blocks if present
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
        }
        
        // Handle incomplete JSON by trying to find the complete object
        if (!cleanedResponse.endsWith('}')) {
          const lastBraceIndex = cleanedResponse.lastIndexOf('}')
          if (lastBraceIndex > -1) {
            cleanedResponse = cleanedResponse.substring(0, lastBraceIndex + 1)
          }
        }
        
        console.log("Attempting to parse cleaned response...")
        parsedResponse = JSON.parse(cleanedResponse.trim())
        console.log("Successfully parsed Gemini response")
        
        // Ensure we have valid products array
        if (!Array.isArray(parsedResponse.recommendedProducts)) {
          parsedResponse.recommendedProducts = []
        }
      } catch (parseError) {
        console.error("Failed to parse Gemini response as JSON:", parseError)
        
        // Extract analysis from non-JSON response
        const analysisMatch = responseText.match(/skinConditionAnalysis['"]\s*:\s*['"]([^'"]+)['"]/i)
        const adviceMatch = responseText.match(/skinCareAdvice['"]\s*:\s*['"]([^'"]+)['"]/i)
        
        parsedResponse = {
          skinConditionAnalysis: analysisMatch ? analysisMatch[1] : 
            `Based on your ${skinType} skin type and age range (${ageRange}), our analysis shows that your main skin concerns are ${skinConcerns.join(", ")}.`,
          skinCareAdvice: adviceMatch ? adviceMatch[1] : 
            "Focus on maintaining a consistent skincare routine and staying hydrated.",
        }
      }

      // Combine backend analysis with Gemini analysis
      if (imageAnalysisInsights && parsedResponse.skinConditionAnalysis) {
        parsedResponse.skinConditionAnalysis = `${parsedResponse.skinConditionAnalysis}\n\nAdditional AI Analysis: ${imageAnalysisInsights}`
      }

      console.log("Gemini response validation passed")
      
      // Use backend products if available
      const finalProducts = backendRecommendations && backendRecommendations.length > 0
        ? backendRecommendations
        : []

      // Create the final response object
      const recommendations = {
        id: analysisId,
        skinConditionAnalysis: parsedResponse.skinConditionAnalysis || 
          `Based on your ${skinType} skin type and concerns, we've identified key areas for improvement.`,
        recommendedProducts: finalProducts,
        routine: backendRoutine,
        morningRoutine: backendRoutine?.morning || [],
        nightRoutine: backendRoutine?.evening || [],
        skinCareAdvice: parsedResponse.skinCareAdvice || 
          "Maintain a consistent skincare routine and be patient with results.",
        aiResponse: responseText,
        acneDetections,
        hasImageAnalysis: !!faceImage,
        userProfile: {
          skinType,
          preferredIngredients,
          avoidIngredients,
          ageRange,
          budget,
          concerns: skinConcerns,
        },
      }

      // Store the results for later retrieval
      storeResults(recommendations.id, recommendations)
      
      console.log("Final recommendations object:", {
        id: recommendations.id,
        hasAnalysis: !!recommendations.skinConditionAnalysis,
        hasProducts: !!recommendations.recommendedProducts,
        productCount: recommendations.recommendedProducts?.length || 0,
        hasMorningRoutine: !!recommendations.morningRoutine,
        hasNightRoutine: !!recommendations.nightRoutine
      })

      return NextResponse.json(recommendations)

    } catch (aiError) {
      console.error("Error with AI processing:", aiError)

      // Fallback when AI fails
      const fallbackProducts = backendRecommendations && backendRecommendations.length > 0
        ? backendRecommendations
        : []
      
      const result = {
        id: analysisId,
        skinConditionAnalysis: `Based on your ${skinType} skin type and age range (${ageRange}), our analysis shows that your main skin concerns are ${skinConcerns.join(", ")}. ${imageAnalysisInsights}`,
        recommendedProducts: fallbackProducts,
        routine: backendRoutine,
        morningRoutine: backendRoutine?.morning || [],
        nightRoutine: backendRoutine?.evening || [],
        skinCareAdvice: "Focus on maintaining a consistent skincare routine and staying hydrated.",
        aiResponse: "AI processing failed, using fallback recommendations",
        acneDetections,
        hasImageAnalysis: !!faceImage,
        userProfile: {
          skinType,
          preferredIngredients,
          avoidIngredients,
          ageRange,
          budget,
          concerns: skinConcerns,
        },
      }

      storeResults(result.id, result)
      return NextResponse.json(result)
    }

  } catch (error) {
    console.error("Error in analysis route:", error)
    return NextResponse.json(
      { 
        error: "Failed to process skin analysis", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
}
