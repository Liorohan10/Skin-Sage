"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, CheckCircle2, Clock, ThumbsUp, Info } from "lucide-react"
import { ResultsLoading } from "./results-loading"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useResultsStore, type ResultsData } from "@/lib/results-store"

interface ResultsContentProps {
  resultId: string
  tab: "recommendations" | "analysis" | "routine"
}

// Use the existing types from results-store
import { RoutineStep } from "@/lib/results-store"

// Enhanced product type with additional fields
interface EnhancedProduct {
  name: string
  description: string

// Enhanced error handling for backend requests
async function fetchWithTimeout(url: string, options: RequestInit, timeout = BACKEND_TIMEOUT) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

  price: string
  ingredients: string
  suitableFor: string
  matchReasons?: string[]
}

// Enhanced data type for results
interface EnhancedResultsData extends Omit<ResultsData, 'morningRoutine' | 'nightRoutine'> {
  recommendedProducts: EnhancedProduct[];
  morningRoutine?: string | string[];
  nightRoutine?: string | string[];
}

// Utility function to process routine steps
const processRoutineStep = (step: string | RoutineStep) => {
  // Get the raw step text
  const rawStepText = typeof step === 'string' 
    ? (step.includes('. ') ? step.substring(step.indexOf('. ') + 2) : step)
    : step.instruction || step.step || '';
  
  // Remove any asterisks that might be present
  const stepText = typeof rawStepText === 'string' 
    ? rawStepText.replace(/\*\*/g, '').replace(/\*/g, '')
    : rawStepText;
    
  // Get product name if available
  const productName = typeof step === 'string' 
    ? null 
    : step.product?.name;
  
  // Extract action from step text if it exists - with support for timing in parentheses
  const actionMatch = typeof stepText === 'string' ? stepText.match(/^([^:]+):(.+)$/) : null;
      const backendResponse = await fetchWithTimeout(`${PYTHON_BACKEND_URL}/api/recommend-products`, {
  const instruction = actionMatch ? actionMatch[2].trim() : stepText;
  
  return { stepText, productName, action, instruction };
};

export function ResultsContent({ resultId, tab }: ResultsContentProps) {
  const router = useRouter()
  const getResult = useResultsStore((state) => state.getResult)
  const [data, setData] = useState<EnhancedResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get the result from the store
    const result = getResult(resultId)

    if (result) {
        
        // Validate backend data structure
        if (backendRecommendations && Array.isArray(backendRecommendations)) {
          backendRecommendations = backendRecommendations.map(product => ({
            name: product.name || 'Unknown Product',
            description: product.description || 'No description available',
            price: product.price || 'Price not available',
            ingredients: product.ingredients || 'Ingredients not listed',
            suitableFor: product.suitableFor || 'All skin types',
            brand: product.brand || 'Unknown Brand',
            rating: product.rating || 0,
            category: product.category || 'Skincare',
            matchReasons: product.matchReasons || ['Recommended for your skin type']
          }))
        }
      console.log("Found result in store:", result) // Debug log
      console.log("Recommended products:", result.recommendedProducts) // Debug log
      setData(result as EnhancedResultsData)
    } else {
      setError("Results not found. Please try starting a new consultation.")
      
      // Provide fallback products when backend fails
      backendRecommendations = [
        {
          name: "Gentle Daily Cleanser",
          description: "A mild, pH-balanced cleanser suitable for daily use",
          price: "₹299",
          ingredients: "Glycerin, Ceramides, Niacinamide",
          suitableFor: skinType,
          brand: "SkinSage",
          rating: 4.5,
          category: "Cleanser",
          matchReasons: [`Suitable for ${skinType} skin`, "Gentle formula", "Contains beneficial ingredients"]
        },
        {
          name: "Hydrating Face Serum",
          description: "Lightweight serum for daily hydration and skin barrier support",
          price: "₹599",
          ingredients: "Hyaluronic Acid, Vitamin B5, Glycerin",
          suitableFor: skinType,
          brand: "SkinSage",
          rating: 4.7,
          category: "Serum",
          matchReasons: [`Perfect for ${skinType} skin`, "Addresses hydration needs", "Non-comedogenic formula"]
        }
      ]
    }

    setLoading(false)
  }, [resultId, getResult])

  if (loading) {
    return <ResultsLoading />
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Error Loading Results</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <div className="flex justify-center space-x-4">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
          <Button onClick={() => router.push("/questionnaire")}>Start New Consultation</Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Results Not Found</h3>
        <p className="text-gray-600 mb-4">We couldn't find the recommendations you're looking for.</p>
        <Button onClick={() => router.push("/questionnaire")}>Start New Consultation</Button>
      </div>
    )
  }

  if (tab === "recommendations") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-4">Recommended Products</h2>
        <p className="text-gray-600 mb-6">
          Based on your skin profile, we recommend the following products that are suitable for your skin type,
          preferences, and budget.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.recommendedProducts.map((product, index) => (
            <Card key={index} className="p-4 h-full flex flex-col">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">{product.name}</h3>
                <p className="text-pink-600 font-medium mb-3">{product.price}</p>
                <p className="text-gray-700 mb-3">{product.description}</p>
                <div className="mt-auto">
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Suitable for:</span> {product.suitableFor}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Key ingredients:</span> {product.ingredients}
                  </div>

                  {/* Display match reasons */}
                  {product.matchReasons && product.matchReasons.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <h4 className="text-sm font-medium mb-2 flex items-center">
                        <ThumbsUp className="h-4 w-4 mr-1 text-green-600" />
                        Why this matches your profile:
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {product.matchReasons.map((reason, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-green-600 mr-1.5">•</span> {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                  Recommended
                </Badge>
                <button className="text-pink-600 text-sm font-medium hover:underline">View Details</button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (tab === "analysis") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-4">Skin Condition Analysis</h2>
        <Card className="p-6">
          <div className="flex items-start space-x-4 mb-6">
            <div className="bg-pink-100 p-2 rounded-full">
              <CheckCircle2 className="h-6 w-6 text-pink-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Analysis Results</h3>
              <p className="text-gray-700">{data.skinConditionAnalysis ? data.skinConditionAnalysis.replace(/\*\*/g, '').replace(/\*/g, '') : ''}</p>
            </div>
          </div>

          {data.skinCareAdvice && (
            <>
              <Separator className="my-6" />
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Info className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Personalized Advice</h3>
                  <p className="text-gray-700">{data.skinCareAdvice ? data.skinCareAdvice.replace(/\*\*/g, '').replace(/\*/g, '') : ''}</p>
                </div>
              </div>
            </>
          )}

          <Separator className="my-6" />

          <div>
            <h3 className="text-lg font-semibold mb-4">Key Observations</h3>
            <ul className="space-y-3">
              {data.userProfile?.concerns?.map((concern, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{concern}</span>
                </li>
              ))}
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>
                  {data.userProfile?.skinType} skin type with specific needs for your {data.userProfile?.ageRange} age
                  range
                </span>
              </li>
            </ul>
          </div>
        </Card>
      </div>
    )
  }

  if (tab === "routine") {
    // Enhanced routine handling to support different formats
    const getRoutineSteps = (routineData: any) => {
      if (!routineData) return [];
      
      // If it's an array already, use it
      if (Array.isArray(routineData)) {
        return routineData;
      }
      
      // If it's a string, split by newlines
      if (typeof routineData === 'string') {
        return routineData.split("\n").filter(line => line.trim() !== '');
      }
      
      // If it's an object with step/instruction properties (like from backend)
      if (typeof routineData === 'object' && routineData !== null) {
        // If it's a collection of routine steps
        if (Array.isArray(routineData.morning) || Array.isArray(routineData.evening)) {
          return routineData;
        }
      }
      
      // Last resort, return empty array
      console.warn("Unknown routine data format:", routineData);
      return [];
          "skinConditionAnalysis": "Comprehensive professional analysis (minimum 300 words) including visual observations if image provided, skin type assessment, concern evaluation, and detailed professional insights about the current skin condition and underlying causes",
          "skinCareAdvice": "Detailed personalized advice (minimum 200 words) including lifestyle recommendations, frequency of product use, what to expect during the adjustment period, when to see results, and long-term skin health maintenance tips"
    // Process the different possible formats with explicit typing
    const morningSteps: (string | RoutineStep)[] = 
      (data.routine?.morning && Array.isArray(data.routine.morning)) 
        ? data.routine.morning 
        : getRoutineSteps(data.morningRoutine) || [];
        
    const eveningSteps: (string | RoutineStep)[] = 
      (data.routine?.evening && Array.isArray(data.routine.evening)) 
        ? data.routine.evening 
        : getRoutineSteps(data.nightRoutine) || [];
        
    const weeklySteps: (string | RoutineStep)[] = 
      (data.routine?.weekly && Array.isArray(data.routine.weekly)) 
        ? data.routine.weekly 
        : [];

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-4">Recommended Skincare Routine</h2>
        <p className="text-gray-600 mb-6">
          temperature: 0.3,
          responds.
        </p>
          maxOutputTokens: 4096,
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-amber-100 p-2 rounded-full">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold">Morning Routine</h3>
            </div>
        Please provide a comprehensive dermatological analysis that includes:
        1. Detailed skin condition assessment based on the provided information
        2. Analysis of how the user's age and skin type interact with their concerns
        3. Professional insights about the detected skin issues (if any)
        4. Explanation of why certain ingredients are beneficial for their specific needs
        5. Lifestyle and environmental factors that may be affecting their skin
        6. Realistic timeline for seeing improvements
        7. Professional recommendations for maintaining healthy skin long-term


            <ol className="space-y-4 mt-4">
              {morningSteps.map((step: string | RoutineStep, index: number) => {
                // Process the step using our utility function
                const { stepText, productName, action, instruction } = processRoutineStep(step);
                
                return (
                  <li key={index} className="flex items-start">
                    <span className="bg-pink-100 text-pink-800 w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      {action ? (
                        <>
                          <span className="font-semibold block">{action}</span>
                          <span className="block text-gray-700 mb-1">{instruction}</span>
                        <div className="mt-1 text-sm bg-blue-50 p-2 rounded border border-blue-100">
                          <span className="font-medium">Product:</span> {productName}
                        </div>
                      )}
        // Try to extract meaningful content even if JSON parsing fails
        let extractedAnalysis = responseText
        let extractedAdvice = ""
        
        // Look for structured content
        const analysisMatch = responseText.match(/(?:skinConditionAnalysis|analysis|condition)['"]*\s*[:=]\s*['"]*([^'"{}]+)/i)
        const adviceMatch = responseText.match(/(?:skinCareAdvice|advice|recommendations)['"]*\s*[:=]\s*['"]*([^'"{}]+)/i)
        
        if (analysisMatch) {
          extractedAnalysis = analysisMatch[1]
        }
        if (adviceMatch) {
          extractedAdvice = adviceMatch[1]
        }
                )
              })}
          skinConditionAnalysis: extractedAnalysis || 
            `Based on your ${skinType} skin type and age range (${ageRange}), our comprehensive analysis shows that your main skin concerns are ${skinConcerns.join(", ")}. Your skin type requires a balanced approach to address both oily and dry areas effectively. The combination of your age and skin type suggests that you may benefit from ingredients that help regulate oil production while maintaining proper hydration levels.`,
          skinCareAdvice: extractedAdvice || 
            `For your ${skinType} skin, I recommend establishing a consistent morning and evening routine. Start with gentle cleansing, followed by targeted treatments for your specific concerns. Always use sunscreen during the day, and consider incorporating the ingredients you prefer gradually. Results typically become visible after 4-6 weeks of consistent use. Stay hydrated, maintain a balanced diet, and be patient with your skin's adjustment period.`,
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-indigo-100 p-2 rounded-full">
                <Clock className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold">Evening Routine</h3>
            </div>

            <ol className="space-y-4 mt-4">
              {eveningSteps.map((step: string | RoutineStep, index: number) => {
                // Process the step using our utility function
                const { stepText, productName, action, instruction } = processRoutineStep(step);
                
                return (
                  <li key={index} className="flex items-start">
                    <span className="bg-pink-100 text-pink-800 w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
      // Generate routine text from backend routine structure if available
      let morningRoutineText = ""
      let nightRoutineText = ""
      
      if (backendRoutine) {
        if (backendRoutine.morning && Array.isArray(backendRoutine.morning)) {
          morningRoutineText = backendRoutine.morning.map((step: any, index: number) => {
            const stepNumber = index + 1
            const stepName = step.step || `Step ${stepNumber}`
            const instruction = step.instruction || 'Follow product instructions'
            const productName = step.product?.name || ''
            
            if (productName) {
              return `${stepNumber}. ${stepName}: Use ${productName}. ${instruction}`
            } else {
              return `${stepNumber}. ${stepName}: ${instruction}`
            }
          }).join('\n')
        }
        
        if (backendRoutine.evening && Array.isArray(backendRoutine.evening)) {
          nightRoutineText = backendRoutine.evening.map((step: any, index: number) => {
            const stepNumber = index + 1
            const stepName = step.step || `Step ${stepNumber}`
            const instruction = step.instruction || 'Follow product instructions'
            const productName = step.product?.name || ''
            
            if (productName) {
              return `${stepNumber}. ${stepName}: Use ${productName}. ${instruction}`
            } else {
              return `${stepNumber}. ${stepName}: ${instruction}`
            }
          }).join('\n')
        }
      }
      
      // Fallback routine generation if backend doesn't provide one
      if (!morningRoutineText && finalProducts.length > 0) {
        const cleanser = finalProducts.find(p => p.category?.toLowerCase().includes('cleanser') || p.name.toLowerCase().includes('cleanser'))
        const serum = finalProducts.find(p => p.category?.toLowerCase().includes('serum') || p.name.toLowerCase().includes('serum'))
        const moisturizer = finalProducts.find(p => p.category?.toLowerCase().includes('moisturizer') || p.name.toLowerCase().includes('moisturizer'))
        
        const morningSteps = []
        if (cleanser) morningSteps.push(`1. Cleanse: Use ${cleanser.name} to gently cleanse your face with lukewarm water`)
        if (serum) morningSteps.push(`2. Treat: Apply ${serum.name} to address your skin concerns`)
        if (moisturizer) morningSteps.push(`3. Moisturize: Apply ${moisturizer.name} to hydrate and protect your skin`)
        morningSteps.push(`4. Protect: Apply a broad-spectrum sunscreen SPF 30 or higher`)
        
        morningRoutineText = morningSteps.join('\n')
      }
      
      if (!nightRoutineText && finalProducts.length > 0) {
        const cleanser = finalProducts.find(p => p.category?.toLowerCase().includes('cleanser') || p.name.toLowerCase().includes('cleanser'))
        const serum = finalProducts.find(p => p.category?.toLowerCase().includes('serum') || p.name.toLowerCase().includes('serum'))
        const moisturizer = finalProducts.find(p => p.category?.toLowerCase().includes('moisturizer') || p.name.toLowerCase().includes('moisturizer'))
        
        const nightSteps = []
        if (cleanser) nightSteps.push(`1. Cleanse: Use ${cleanser.name} to remove the day's impurities`)
        if (serum) nightSteps.push(`2. Treat: Apply ${serum.name} for overnight skin repair`)
        if (moisturizer) nightSteps.push(`3. Moisturize: Apply ${moisturizer.name} for overnight hydration`)
        
        nightRoutineText = nightSteps.join('\n')
      }

                      {index + 1}
                    </span>
                    <div className="flex-1">
                      {action ? (
          `Based on your ${skinType} skin type and age range (${ageRange}), our comprehensive analysis shows that your main skin concerns are ${skinConcerns.join(", ")}. Your skin requires a balanced approach that addresses your specific needs while maintaining overall skin health.`,
                          <span className="font-semibold block">{action}</span>
                          <span className="block text-gray-700 mb-1">{instruction}</span>
        morningRoutine: morningRoutineText || "1. Cleanse gently\n2. Apply treatment products\n3. Moisturize\n4. Apply sunscreen",
        nightRoutine: nightRoutineText || "1. Cleanse thoroughly\n2. Apply treatment products\n3. Moisturize",
                        <span className="block mb-1">{instruction}</span>
          `For your ${skinType} skin, maintain a consistent routine and introduce new products gradually. Results typically become visible after 4-6 weeks of consistent use. Stay hydrated, protect your skin from sun damage, and be patient during the adjustment period.`,
                      {productName && (
                        <div className="mt-1 text-sm bg-blue-50 p-2 rounded border border-blue-100">
                          <span className="font-medium">Product:</span> {productName}
        source: "hybrid_analysis",
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </Card>
        </div>

        {weeklySteps.length > 0 && (
          <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold mb-2">Weekly Treatments</h3>
            <p className="text-gray-700 mb-4">In addition to your daily routine, consider these weekly treatments:</p>
            <ul className="space-y-3">
              {weeklySteps.map((step: string | RoutineStep, index: number) => {
                // Process the step using our utility function
                const { stepText, productName, action, instruction } = processRoutineStep(step);
        hasMorningRoutine: !!recommendations.morningRoutine,
        hasNightRoutine: !!recommendations.nightRoutine,
        source: recommendations.source
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      {action ? (
                        <>
                          <span className="font-semibold block">{action}</span>
                          <span className="block text-gray-700 mb-1">{instruction}</span>
                        </>
                      ) : (
                        <span className="block mb-1">{instruction}</span>
                      )}
                      {productName && (
      // Generate fallback routine text
      const fallbackMorningRoutine = fallbackProducts.length > 0 
        ? `1. Cleanse: Use ${fallbackProducts[0]?.name || 'a gentle cleanser'} to start your day\n2. Treat: Apply targeted treatments for your concerns\n3. Moisturize: Use a suitable moisturizer for ${skinType} skin\n4. Protect: Apply broad-spectrum sunscreen`
        : "1. Cleanse gently\n2. Apply treatment products\n3. Moisturize\n4. Apply sunscreen"
        
      const fallbackNightRoutine = fallbackProducts.length > 0
        ? `1. Cleanse: Use ${fallbackProducts[0]?.name || 'a gentle cleanser'} to remove impurities\n2. Treat: Apply overnight treatments\n3. Moisturize: Use a nourishing night moisturizer`
        : "1. Cleanse thoroughly\n2. Apply treatment products\n3. Moisturize"

                        <div className="mt-1 text-sm bg-blue-50 p-2 rounded border border-blue-100">
                          <span className="font-medium">Product:</span> {productName}
        skinConditionAnalysis: `Based on your ${skinType} skin type and age range (${ageRange}), our comprehensive analysis shows that your main skin concerns are ${skinConcerns.join(", ")}. Your skin type requires a balanced approach that addresses both your specific concerns and maintains overall skin health. ${imageAnalysisInsights ? `Additional insights: ${imageAnalysisInsights}` : ''}`,
                      )}
                    </div>
        morningRoutine: fallbackMorningRoutine,
        nightRoutine: fallbackNightRoutine,
        skinCareAdvice: `For your ${skinType} skin, focus on maintaining a consistent skincare routine. Introduce new products gradually and be patient with results, which typically appear after 4-6 weeks. Stay hydrated, protect your skin from environmental damage, and consider consulting a dermatologist for persistent concerns.`,
            </ul>
          </Card>
        )}
        source: "fallback_analysis",

        {weeklySteps.length === 0 && (
          <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold mb-2">Weekly Treatments</h3>
            <p className="text-gray-700 mb-4">In addition to your daily routine, consider these weekly treatments:</p>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Gentle exfoliation 1-2 times per week to remove dead skin cells</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Hydrating mask once per week, focusing on dry areas</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Clay mask on oily areas once per week to control excess sebum</span>
              </li>
            </ul>
          </Card>
        )}
      </div>
    )
  }

  return null
}
