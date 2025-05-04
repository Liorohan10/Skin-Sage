import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"
import { storeResults } from "../results/[id]/route"
import { inferSkinConcerns } from "@/lib/recommendation-engine"

// Initialize the Google Generative AI with the API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "")

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

    try {
      // Configure the model - using Gemini 2.0 Flash for enhanced capabilities
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
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

      // Prepare the prompt for Gemini with detailed instructions
      let prompt = `
        You are a professional dermatologist and skincare expert. I need detailed and personalized skincare recommendations based on the following information:
        
        Skin Type: ${skinType}
        Skin Concerns: ${skinConcerns.join(", ")}
        Preferred Ingredients: ${preferredIngredients.join(", ")}
        Ingredients to Avoid: ${avoidIngredients.join(", ")}
        Age Range: ${ageRange}
        Budget Preference: ${budget}
        
        Please provide your response in the following JSON format ONLY, with no additional text or explanations outside the JSON:
        {
          "skinConditionAnalysis": "Detailed analysis of the skin condition based on the provided information, including specific concerns and recommendations",
          "recommendedProducts": [
            {
              "name": "Product Name",
              "description": "Detailed product description",
              "price": "Price range",
              "ingredients": "Key ingredients with their benefits",
              "suitableFor": "Skin types this product is suitable for",
              "matchReasons": ["Specific reason this product matches the user's needs", "Another specific reason"]
            }
          ],
          "morningRoutine": "Step-by-step morning skincare routine with product types and order of application",
          "nightRoutine": "Step-by-step night skincare routine with product types and order of application",
          "skinCareAdvice": "Additional personalized advice for the user's specific skin concerns"
        }
      `

      // Create parts array for the model input
      const parts = [{ text: prompt }]

      // Handle image if provided
      const faceImage = formData.get("faceImage") as File | null
      if (faceImage) {
        try {
          // Convert image to base64 for Gemini API
          const buffer = await faceImage.arrayBuffer()
          const base64Image = Buffer.from(buffer).toString("base64")
          const mimeType = faceImage.type

          // Add image analysis request to the prompt
          prompt +=
            "\n\nI'm also providing a facial image. Please analyze this image to identify visible skin conditions such as dryness, oiliness, acne, hyperpigmentation, fine lines, or other concerns. Include these observations in your analysis and tailor your product recommendations and skincare routine accordingly. Be specific about what you observe in the image and how it influences your recommendations."

          // Add image to parts array
          parts.push({
            inlineData: {
              mimeType,
              data: base64Image,
            },
          })
        } catch (imageError) {
          console.error("Error processing image:", imageError)
          // Continue without the image if there's an error
        }
      }

      // Generate content with Gemini
      const result = await model.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2, // Lower temperature for more consistent results
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
      })

      const response = result.response
      const responseText = response.text()

      // Try to parse the JSON response from Gemini
      let parsedResponse
      try {
        // Extract JSON from the response (it might be wrapped in markdown code blocks)
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
          responseText.match(/```\n([\s\S]*?)\n```/) || [null, responseText]

        const jsonStr = jsonMatch[1] || responseText
        parsedResponse = JSON.parse(jsonStr.trim())
      } catch (parseError) {
        console.error("Failed to parse Gemini response as JSON:", parseError)
        console.log("Raw response:", responseText)

        // If parsing fails, use our recommendation engine
        const { RecommendationEngine, mapBudgetToRange } = await import("@/lib/recommendation-engine")
        const { products } = await import("@/lib/product-database")

        const engine = new RecommendationEngine(products)
        const userProfile = {
          skinType,
          preferredIngredients,
          avoidIngredients,
          ageRange,
          budget: mapBudgetToRange(budget),
          concerns: skinConcerns,
        }

        const recommendations = engine.recommendProducts(userProfile, 5)
        const routine = engine.generateRoutine(userProfile)

        // Format the morning and night routines as strings
        const morningRoutineText = routine.morningRoutine
          .map((product, index) => `${index + 1}. ${product.name}`)
          .join("\n")

        const nightRoutineText = routine.nightRoutine
          .map((product, index) => `${index + 1}. ${product.name}`)
          .join("\n")

        // Create the analysis text based on user profile
        const skinConditionAnalysis = `Based on your ${skinType} skin type and age range (${ageRange}), 
          our analysis shows that your main skin concerns are ${skinConcerns.join(", ")}. 
          ${skinType === "Combination" ? "You may experience oiliness in the T-zone and dryness on the cheeks." : ""}
          ${skinType === "Sensitive" ? "Your skin may react to certain ingredients and environmental factors." : ""}
          ${
            ageRange === "35-44" || ageRange === "45-54" || ageRange === "55-plus"
              ? "You may be experiencing signs of aging such as fine lines, wrinkles, or loss of firmness."
              : ""
          }`

        parsedResponse = {
          skinConditionAnalysis,
          recommendedProducts: recommendations.products.map((product) => ({
            name: product.name,
            description: product.description,
            price: `$${product.price.toFixed(2)}`,
            ingredients: product.keyIngredients.join(", "),
            suitableFor: product.suitableFor.skinTypes.join(", "),
            matchReasons: recommendations.matchReasons[product.id] || [],
          })),
          morningRoutine:
            morningRoutineText || "1. Gentle Cleanser\n2. Hydrating Toner\n3. Serum\n4. Moisturizer\n5. Sunscreen",
          nightRoutine:
            nightRoutineText || "1. Double cleanse\n2. Exfoliating Toner\n3. Treatment Serum\n4. Night Cream",
          skinCareAdvice: "Focus on maintaining a consistent skincare routine and staying hydrated.",
        }
      }

      // Create the final response object
      const recommendations = {
        id: analysisId,
        skinConditionAnalysis: parsedResponse.skinConditionAnalysis,
        recommendedProducts: parsedResponse.recommendedProducts,
        morningRoutine: parsedResponse.morningRoutine,
        nightRoutine: parsedResponse.nightRoutine,
        skinCareAdvice: parsedResponse.skinCareAdvice || "Maintain a consistent skincare routine for best results.",
        aiResponse: responseText,
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

      return NextResponse.json(recommendations)
    } catch (aiError) {
      console.error("Error with AI processing:", aiError)

      // Fall back to our recommendation engine
      const { RecommendationEngine, mapBudgetToRange } = await import("@/lib/recommendation-engine")
      const { products } = await import("@/lib/product-database")

      const engine = new RecommendationEngine(products)
      const userProfile = {
        skinType,
        preferredIngredients,
        avoidIngredients,
        ageRange,
        budget: mapBudgetToRange(budget),
        concerns: skinConcerns,
      }

      const recommendations = engine.recommendProducts(userProfile, 5)
      const routine = engine.generateRoutine(userProfile)

      // Format the morning and night routines as strings
      const morningRoutineText = routine.morningRoutine
        .map((product, index) => `${index + 1}. ${product.name}`)
        .join("\n")

      const nightRoutineText = routine.nightRoutine.map((product, index) => `${index + 1}. ${product.name}`).join("\n")

      // Create the analysis text based on user profile
      const skinConditionAnalysis = `Based on your ${skinType} skin type and age range (${ageRange}), 
        our analysis shows that your main skin concerns are ${skinConcerns.join(", ")}. 
        ${skinType === "Combination" ? "You may experience oiliness in the T-zone and dryness on the cheeks." : ""}
        ${skinType === "Sensitive" ? "Your skin may react to certain ingredients and environmental factors." : ""}
        ${
          ageRange === "35-44" || ageRange === "45-54" || ageRange === "55-plus"
            ? "You may be experiencing signs of aging such as fine lines, wrinkles, or loss of firmness."
            : ""
        }`

      const result = {
        id: analysisId,
        skinConditionAnalysis,
        recommendedProducts: recommendations.products.map((product) => ({
          name: product.name,
          description: product.description,
          price: `$${product.price.toFixed(2)}`,
          ingredients: product.keyIngredients.join(", "),
          suitableFor: product.suitableFor.skinTypes.join(", "),
          matchReasons: recommendations.matchReasons[product.id] || [],
        })),
        morningRoutine:
          morningRoutineText || "1. Gentle Cleanser\n2. Hydrating Toner\n3. Serum\n4. Moisturizer\n5. Sunscreen",
        nightRoutine: nightRoutineText || "1. Double cleanse\n2. Exfoliating Toner\n3. Treatment Serum\n4. Night Cream",
        skinCareAdvice: "Focus on maintaining a consistent skincare routine and staying hydrated.",
        aiResponse: "Generated by fallback recommendation engine",
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
      storeResults(result.id, result)

      return NextResponse.json(result)
    }
  } catch (error) {
    console.error("Error processing request:", error)
    return NextResponse.json(
      { error: "Failed to process request", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
