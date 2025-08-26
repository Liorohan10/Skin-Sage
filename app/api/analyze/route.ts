import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"
import { storeResults } from "../results/[id]/route"

// Initialize the Google Generative AI with the API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "")

// Python backend URL
const PYTHON_BACKEND_URL = "http://127.0.0.1:8000"

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
    
    // Helper function to format routine steps and match products
    const formatRoutine = (routineData: any, recommendedProducts = []) => {
      // Handle empty or undefined input
      if (!routineData) return []
      
      // Helper to find matching product from recommendations
      const findMatchingProduct = (stepText: string) => {
        if (!recommendedProducts || !Array.isArray(recommendedProducts)) return null;
        
        // Try to match product name in the step text
        return recommendedProducts.find((product: any) => {
          if (!product || !product.name) return false;
          return stepText.toLowerCase().includes(product.name.toLowerCase());
        });
      };
      
      // If already an array, process each element
      if (Array.isArray(routineData)) {
        return routineData.map(step => {
          // If it's an object with specific structure (from backend), return as is
          if (typeof step === 'object' && step !== null) {
            return step
          }
          
          // If it's a string step, process it and try to match with product
          if (typeof step === 'string') {
            // Clean up markdown formatting
            const cleanedStep = step.replace(/\*\*/g, '').replace(/\*/g, '');
            
            // Try to find a matching product
            const matchedProduct = findMatchingProduct(cleanedStep);
            
            // If product found, return structured step
            if (matchedProduct) {
              return {
                step: cleanedStep,
                product: matchedProduct,
                instruction: cleanedStep
              };
            }
            
            return cleanedStep;
          }
          
          return step
        })
      }
      
      // Handle string input (original behavior)
      if (typeof routineData === 'string') {
        // Clean up any markdown formatting
        const cleanRoutine = routineData.replace(/\*\*/g, '').replace(/\*/g, '')
        
        // Split by lines and filter out empty lines
        const steps = cleanRoutine.split('\n')
          .filter(line => line.trim())
          .map(line => {
            // Remove numbers at the beginning if present
            const cleanLine = line.replace(/^\d+\.\s*/, '').trim()
            
            // Try to find a matching product
            const matchedProduct = findMatchingProduct(cleanLine);
            
            // Format step with proper prefix if not present
            if (cleanLine.startsWith('**') || 
                cleanLine.startsWith('++') || 
                cleanLine.toLowerCase().includes('cleanse') || 
                cleanLine.toLowerCase().includes('moisturize') || 
                cleanLine.toLowerCase().includes('treat') || 
                cleanLine.toLowerCase().includes('protect')) {
              
              // If product found, return structured step
              if (matchedProduct) {
                return {
                  step: cleanLine,
                  product: matchedProduct,
                  instruction: cleanLine
                };
              }
              return cleanLine
            }
            
            // If product found, return structured step
            if (matchedProduct) {
              return {
                step: `++Step++ ${cleanLine}`,
                product: matchedProduct,
                instruction: cleanLine
              };
            }
            return `++Step++ ${cleanLine}`
          })
        
        return steps
      }
      
      // Return empty array for unsupported types
      console.warn('Unsupported routine format received:', typeof routineData)
      return []
    }

    // First, try to get recommendations from Python backend using Supabase
    try {
      console.log("Attempting to fetch products from Python backend (Supabase)...")
      
      // Parse budget range from string (e.g., "₹500-1000" to [500, 1000])
      const budgetRange = budget.replace('₹', '').split('-').map(Number)
      const minPrice = budgetRange[0] || 0
      const maxPrice = budgetRange[1] || 5000
      
      // Format the request data according to the backend's expected structure
      // Notice we're using the exact field names that the backend expects
      const backendRequestData = {
        age_group: ageRange,
        skin_concerns: skinConcerns,
        skin_type: skinType,
        price_range: [minPrice, maxPrice],
        ingredients: preferredIngredients,
        avoid_ingredients: avoidIngredients,
        use_ai_enhancement: true
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
        console.log("Successfully fetched backend data with structure:", {
        hasProducts: !!backendData.products,
        hasRecommendations: !!backendData.recommendations,
        hasRoutine: !!backendData.routine,
        hasSkinAnalysis: !!backendData.skin_analysis
      })
      console.log("Backend product count:", 
        (backendData.products?.length || 0) + 
        (backendData.recommendations?.length || 0)
      )
        
        // Store the backend data for use later - handle both formats
        backendRecommendations = backendData.products || backendData.recommendations || []
        backendRoutine = backendData.routine || null
        
        // Log what we got from backend
        console.log("Backend products count:", backendRecommendations.length)
        console.log("Backend routine format:", backendRoutine ? "Found" : "Not provided")
      } else {
        console.error("Backend error:", backendResponse.status, await backendResponse.text())
      }
    } catch (backendError) {
      console.error("Failed to fetch from backend:", backendError)
    }
    
    try {
      // Configure the model - using Gemini 2.5 Flash for enhanced capabilities
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
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

      // Enhanced prompt for natural analysis
      const prompt = `
        You are an expert dermatologist and skincare specialist. Please provide a comprehensive skin analysis and product recommendations.

        User Profile:
        - Skin Type: ${skinType}
        - Age Range: ${ageRange}
        - Budget: ${budget}
        - Skin Concerns: ${skinConcerns.join(", ")}
        - Preferred Ingredients: ${preferredIngredients.join(", ")}
        - Ingredients to Avoid: ${avoidIngredients.join(", ")}

        Please analyze this user's skin profile and provide recommendations in the following JSON format:
        {
          "skinConditionAnalysis": "Detailed analysis of the skin condition based on the provided information. Include specific observations about skin texture, tone, concerns, and overall condition.",
          "recommendedProducts": [
            {
              "name": "Product Name",
              "description": "Detailed product description explaining why this product is suitable",
              "price": "Price range or specific price",
              "ingredients": "Key active ingredients and their specific benefits for the user's skin concerns",
              "suitableFor": "Specific skin types and concerns this product addresses",
              "matchReasons": ["Specific reason this product matches the user's needs", "Another specific reason based on ingredients or skin analysis"]
            }
          ],
          "morningRoutine": [
            "**Cleanse:** Wash your face with a gentle cleanser suited for your skin type.",
            "**Tone:** Apply a hydrating toner to balance your skin.",
            "**Treat:** Apply a serum with ingredients targeting your specific concerns.",
            "**Moisturize:** Use a lightweight moisturizer suitable for your skin type.",
            "**Protect:** Apply a broad-spectrum sunscreen with at least SPF 30."
          ],
          "nightRoutine": [
            "**Double Cleanse:** Remove makeup and sunscreen with an oil cleanser, followed by a regular cleanser.",
            "**Tone:** Apply a hydrating toner to prep skin for treatments.",
            "**Treat:** Apply treatment products for your specific skin concerns.",
            "**Moisturize:** Apply a night cream or richer moisturizer to repair skin overnight.",
            "**Optional:** Use an eye cream if you have specific eye area concerns."
          ],
          "skinCareAdvice": "Additional personalized advice including lifestyle recommendations, frequency of product use, what to expect during the adjustment period, and when to see results."
        }
      `

      // Create parts array for the model input
      const parts: any[] = [{ text: prompt }]

      // Handle image if provided
      const faceImage = formData.get("faceImage") as File | null
      if (faceImage) {
        try {
          // Convert image to base64 for Gemini API
          const buffer = await faceImage.arrayBuffer()
          const base64Image = Buffer.from(buffer).toString("base64")
          const mimeType = faceImage.type

          // Add image analysis request to the prompt
          parts[0].text += "\n\nI'm also providing a facial image. Please analyze this image to identify visible skin conditions such as dryness, oiliness, acne, hyperpigmentation, fine lines, or other concerns. Include these observations in your analysis and tailor your product recommendations and skincare routine accordingly. Be specific about what you observe in the image and how it influences your recommendations."

          // Add image to parts array with correct format for Gemini
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
        console.log("Raw response:", responseText.substring(0, 500) + "...")
        
        // Final fallback with generic recommendations
        parsedResponse = {
          skinConditionAnalysis: `Based on your ${skinType} skin type and age range (${ageRange}), our analysis shows that your main skin concerns are ${skinConcerns.join(", ")}.`,
          recommendedProducts: [
            {
              name: "Gentle Daily Cleanser",
              description: "A mild cleanser suitable for daily use",
              price: "₹300-500",
              ingredients: "Gentle surfactants, moisturizing agents",
              suitableFor: `${skinType} skin`,
              matchReasons: [`Suitable for ${skinType} skin`, "Gentle formulation"]
            }
          ],
          morningRoutine: "1. Gentle Cleanser\n2. Hydrating Toner\n3. Serum\n4. Moisturizer\n5. Sunscreen",
          nightRoutine: "1. Double cleanse\n2. Exfoliating Toner\n3. Treatment Serum\n4. Night Cream",
          skinCareAdvice: "Focus on maintaining a consistent skincare routine and staying hydrated.",
        }
      }

      // Validate the parsed response
      if (!parsedResponse.skinConditionAnalysis || !parsedResponse.recommendedProducts) {
        console.log("Parsed response missing required fields, using fallback")
        throw new Error("Incomplete response from Gemini")
      }

      console.log("Gemini response validation passed")
      
      // Use Supabase products if available, otherwise use Gemini products
      const finalProducts = backendRecommendations && backendRecommendations.length > 0
        ? backendRecommendations
        : parsedResponse.recommendedProducts

      // Format the routines properly to ensure consistent structure for different types
      const formatRoutine = (routineData: any, recommendedProducts: any[] = []) => {
        // Handle empty or undefined input
        if (!routineData) return []
        
        // Helper to find matching product from recommendations
        const findMatchingProduct = (stepText: string) => {
          if (!recommendedProducts || !Array.isArray(recommendedProducts)) return null;
          
          // Try to match product name in the step text
          return recommendedProducts.find((product: any) => {
            if (!product || !product.name) return false;
            return stepText.toLowerCase().includes(product.name.toLowerCase());
          });
        };
        
        // If already an array, process each element
        if (Array.isArray(routineData)) {
          return routineData.map(step => {
            // If it's an object with specific structure (from backend), return as is
            if (typeof step === 'object' && step !== null) {
              return step
            }
            
            // If it's a string step, process it and try to match with product
            if (typeof step === 'string') {
              // Clean up markdown formatting
              const cleanedStep = step.replace(/\*\*/g, '').replace(/\*/g, '')
              
              // Try to find a matching product
              const matchedProduct = findMatchingProduct(cleanedStep);
              
              // If product found, return structured step
              if (matchedProduct) {
                return {
                  step: cleanedStep,
                  product: matchedProduct,
                  instruction: cleanedStep
                };
              }
              
              return cleanedStep;
            }
            
            return step
          })
        }
        
        // Handle string input (original behavior)
        if (typeof routineData === 'string') {
          // Clean up any markdown formatting
          const cleanRoutine = routineData.replace(/\*\*/g, '').replace(/\*/g, '')
          
          // Split by lines and filter out empty lines
          const steps = cleanRoutine.split('\n')
            .filter(line => line.trim())
            .map(line => {
              // Remove numbers at the beginning if present
              const cleanLine = line.replace(/^\d+\.\s*/, '').trim()
              
              // Try to find a matching product
              const matchedProduct = findMatchingProduct(cleanLine);
              
              // Format step with proper prefix if not present
              if (cleanLine.startsWith('**') || 
                  cleanLine.startsWith('++') || 
                  cleanLine.toLowerCase().includes('cleanse') || 
                  cleanLine.toLowerCase().includes('moisturize') || 
                  cleanLine.toLowerCase().includes('treat') || 
                  cleanLine.toLowerCase().includes('protect')) {
                
                // If product found, return structured step
                if (matchedProduct) {
                  return {
                    step: cleanLine,
                    product: matchedProduct,
                    instruction: cleanLine
                  };
                }
                return cleanLine
              }
              
              // If product found, return structured step
              if (matchedProduct) {
                return {
                  step: `++Step++ ${cleanLine}`,
                  product: matchedProduct,
                  instruction: cleanLine
                };
              }
              return `++Step++ ${cleanLine}`
            })
          
          return steps
        }
        
        // Return empty array for unsupported types
        console.warn('Unsupported routine format received:', typeof routineData)
        return []
      }
      
      // Create structured routines from text or arrays, matching with products
      const morningSteps = formatRoutine(parsedResponse.morningRoutine, finalProducts)
      const eveningSteps = formatRoutine(parsedResponse.nightRoutine, finalProducts)

      // Create the final response object
      const recommendations = {
        id: analysisId,
        skinConditionAnalysis: parsedResponse.skinConditionAnalysis,
        // Use backend recommendations if available, otherwise use Gemini's
        recommendedProducts: finalProducts,
        // Use routines from backend if available, otherwise use Gemini's
        routine: backendRoutine || {
          morning: morningSteps,
          evening: eveningSteps,
          weekly: []
        },
        // For backwards compatibility
        morningRoutine: backendRoutine?.morning || morningSteps,
        nightRoutine: backendRoutine?.evening || eveningSteps,
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

      // Ultimate fallback with basic recommendations
      // Use Supabase products if we got them, even if Gemini failed
      const fallbackProducts = backendRecommendations && backendRecommendations.length > 0
        ? backendRecommendations
        : [
            {
              name: "Gentle Daily Cleanser",
              description: "A mild cleanser suitable for daily use",
              price: "₹300-500",
              ingredients: "Gentle surfactants, moisturizing agents",
              suitableFor: `${skinType} skin`,
              matchReasons: [`Suitable for ${skinType} skin`, "Gentle formulation"]
            }
          ]
      
      const formattedMorningRoutine = [
        "Cleanse (60 seconds): Wash your face with lukewarm water, apply a small amount of gentle cleanser to damp skin, and massage in circular motions for 60 seconds. Focus on the T-zone where oil accumulates. Rinse thoroughly and pat dry with a clean towel.",
        "Tone (30 seconds): Apply toner using a cotton pad or clean hands, gently patting onto skin to balance pH levels and prepare your skin for treatment products. Avoid the delicate eye area.",
        "Treat (Wait 1 minute): Apply 2-3 drops of treatment serum targeting your specific skin concerns. Gently pat into skin using your fingertips and allow to absorb completely before the next step.",
        "Moisturize (Wait 2 minutes): Apply a lightweight moisturizer using upward motions across your face and neck. This creates a protective barrier and locks in hydration from previous steps.",
        "Protect (Apply 15 mins before sun exposure): Apply broad-spectrum sunscreen with at least SPF 30 using the two-finger rule for adequate coverage. Reapply every 2 hours when exposed to sunlight."
      ]
      
      const formattedEveningRoutine = [
        "Double Cleanse (60 seconds): Start with an oil cleanser massaged onto dry skin for 30 seconds to dissolve makeup and sunscreen. Rinse, then follow with a water-based cleanser for another 30 seconds to remove remaining impurities.",
        "Tone (30 seconds): Apply toner with gentle patting motions to restore your skin's pH balance after cleansing and prepare it for nighttime treatments.",
        "Treat (Wait 1 minute): Apply evening treatment products focusing on skin repair and regeneration. For active ingredients like retinol, use a pea-sized amount and allow 15-20 minutes for full absorption.",
        "Moisturize (Wait 2 minutes): Apply a richer night moisturizer or cream using gentle upward strokes. Night formulations support your skin's natural repair process while you sleep.",
        "Eye Care (Before bed): If using eye cream, gently tap around the orbital bone using your ring finger. This addresses specific concerns like dark circles or fine lines in the delicate eye area."
      ]
      
      const result = {
        id: analysisId,
        skinConditionAnalysis: `Based on your ${skinType} skin type and age range (${ageRange}), our analysis shows that your main skin concerns are ${skinConcerns.join(", ")}.`,
        recommendedProducts: fallbackProducts,
        // Use structured routines for consistency
        routine: backendRoutine || {
          morning: formattedMorningRoutine,
          evening: formattedEveningRoutine,
          weekly: []
        },
        // For backwards compatibility
        morningRoutine: backendRoutine?.morning || formatRoutine(formattedMorningRoutine, fallbackProducts),
        nightRoutine: backendRoutine?.evening || formatRoutine(formattedEveningRoutine, fallbackProducts),
        skinCareAdvice: "Focus on maintaining a consistent skincare routine and staying hydrated.",
        aiResponse: "AI processing failed, using fallback recommendations",
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
