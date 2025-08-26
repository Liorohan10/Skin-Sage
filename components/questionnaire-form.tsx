"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { SkinTypeStep } from "@/components/questionnaire/skin-type-step"
import { IngredientsStep } from "@/components/questionnaire/ingredients-step"
import { AvoidIngredientsStep } from "@/components/questionnaire/avoid-ingredients-step"
import { ImageUploadStep } from "@/components/questionnaire/image-upload-step"
import { AgeRangeStep } from "@/components/questionnaire/age-range-step"
import { BudgetStep } from "@/components/questionnaire/budget-step"
import { SkinConcernsStep } from "@/components/questionnaire/skin-concerns-step"
import { ReviewStep } from "@/components/questionnaire/review-step"
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useResultsStore } from "@/lib/results-store"
import { resizeImage } from "@/lib/image-utils"

// Use Next.js proxy API so responses log in the npm dev terminal
// These proxy routes forward to the Python backend and log Gemini output
const PROXY_RECOMMEND_URL = "/api/backend/recommend-products"
const PROXY_ANALYZE_URL = "/api/backend/analyze-skin"

export type FormData = {
  skinType: string
  preferredIngredients: string[]
  avoidIngredients: string[]
  faceImage: File | null
  faceImagePreview: string | null
  ageRange: string
  budget: string
  skinConcerns: string[]
}

export function QuestionnaireForm() {
  const router = useRouter()
  const addResult = useResultsStore((state) => state.addResult)
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<FormData>({
    skinType: "",
    preferredIngredients: [],
    avoidIngredients: [],
    faceImage: null,
    faceImagePreview: null,
    ageRange: "",
    budget: "",
    skinConcerns: [],
  })

  // Add isSubmitting state and error state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const steps = [
    { name: "Skin Type", component: SkinTypeStep },
    { name: "Skin Concerns", component: SkinConcernsStep },
    { name: "Preferred Ingredients", component: IngredientsStep },
    { name: "Avoid Ingredients", component: AvoidIngredientsStep },
    { name: "Face Image", component: ImageUploadStep },
    { name: "Age Range", component: AgeRangeStep },
    { name: "Budget", component: BudgetStep },
    { name: "Review", component: ReviewStep },
  ]

  const CurrentStepComponent = steps[currentStep].component
  const stepProgress = (currentStep / (steps.length - 1)) * 100

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
      window.scrollTo(0, 0)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      window.scrollTo(0, 0)
    }
  }

  // Validate form before submission
  const validateForm = () => {
    // Check if required fields are filled
    if (!formData.skinType) {
      setError("Please select a skin type")
      return false
    }

    if (formData.preferredIngredients.length === 0) {
      setError("Please select at least one preferred ingredient")
      return false
    }

    if (!formData.ageRange) {
      setError("Please select an age range")
      return false
    }

    if (!formData.budget) {
      setError("Please select a budget preference")
      return false
    }

    return true
  }

  // Update to use backend API with Gemini integration
  const handleSubmit = async () => {
    setError(null)
    if (!validateForm()) return
    
    try {
      setIsSubmitting(true)
      setProgress(20)

      // Prepare payload for product recommendation + routine
      // Map selected budget to INR ranges
  const budgetRange = (() => {
        switch (formData.budget) {
          case 'budget':
            return [400, 1700]
          case 'mid-tier':
            return [1700, 4200]
          case 'premium':
    return [4200, 999999]
          case 'mixed':
    // Send a wide-open range; backend will clamp to live max price and sample across tiers
    return [400, 999999]
          default:
            return [0, 5000]
        }
      })()
      const payload = {
        age_group: formData.ageRange,
        skin_concerns: formData.skinConcerns,
        skin_type: formData.skinType,
  price_range: [budgetRange[0], budgetRange[1]],
        ingredients: formData.preferredIngredients,
        avoid_ingredients: formData.avoidIngredients,
  use_ai_enhancement: true,
  budget_tier: formData.budget,
      }

      setProgress(50)

      // Call the backend recommendation endpoint
  // Call via proxy so logs show in Next.js dev terminal
  const response = await fetch(PROXY_RECOMMEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      setProgress(80)

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to get routine from API");
      }

      const result = await response.json();
      console.log("API routine result:", result); // Debug log
      console.log("Result keys:", Object.keys(result)); // Debug log
      console.log("Recommendations:", result.recommendations); // Debug log
      console.log("Routine:", result.routine); // Debug log
      console.log("Skin analysis:", result.skin_analysis); // Debug log

      // Optionally analyze image if provided
      let analysis = null
      if (formData.faceImage) {
        try {
          // Client-side debug: log selected file metadata before upload
          try {
            console.log('[Client][analyze] selected image:', {
              name: formData.faceImage?.name,
              size: formData.faceImage?.size,
              type: formData.faceImage?.type,
              preview: formData.faceImagePreview,
            })
          } catch (logErr) {
            console.warn('[Client][analyze] could not read file metadata', logErr)
          }

          const fd = new FormData()
          fd.append('file', formData.faceImage)
          fd.append('skin_type', formData.skinType)
          fd.append('age_group', formData.ageRange)
          fd.append('skin_concerns', JSON.stringify(formData.skinConcerns))
          fd.append('ingredients', JSON.stringify(formData.preferredIngredients))
          fd.append('avoid_ingredients', JSON.stringify(formData.avoidIngredients))
          fd.append('price_range', JSON.stringify(payload.price_range))
          // Log FormData keys for debugging (note: File objects won't stringify fully)
          try {
            for (const entry of fd.entries()) {
              const [k, v] = entry as [string, any]
              if (v instanceof File) {
                console.log(`[Client][analyze] FormData append: ${k} => File(name=${v.name}, size=${v.size})`)
              } else {
                console.log(`[Client][analyze] FormData append: ${k} => ${String(v).slice(0, 120)}`)
              }
            }
          } catch (logErr) {
            console.warn('[Client][analyze] could not enumerate FormData entries', logErr)
          }
          // Call via proxy so logs show in Next.js dev terminal
          const analyzeRes = await fetch(PROXY_ANALYZE_URL, { method: 'POST', body: fd })
          if (analyzeRes.ok) {
            analysis = await analyzeRes.json()
          }
        } catch (e) {
          console.warn('Image analysis failed:', e)
        }
      }

      setProgress(90);

      // Add a unique ID to the result before storing
      const resultWithId = { 
        ...result, 
        // Use a URL-safe numeric ID to avoid issues with colons or special
        // characters from ISO strings when routing to /results/:id
        id: String(Date.now()), 
        analysis,
        // Ensure required fields exist with fallbacks
  recommendations: result.recommendations || [],
  // Map to UI-expected field so ResultsContent can render product cards
  recommendedProducts: result.recommendations || [],
        routine: result.routine || { morning: [], evening: [], weekly: [] },
        skin_analysis: result.skin_analysis || { consultation: "Analysis not available" }
      };
      
      console.log("Final result being stored:", resultWithId); // Debug log
      addResult(resultWithId);
      
      setProgress(100);
      router.push(`/results/${resultWithId.id}`);
      
    } catch (error) {
      console.error("Error submitting questionnaire:", error)
      setError(error instanceof Error ? error.message : "An unexpected error occurred. Please try again.")
      setIsSubmitting(false)
      setProgress(0)
    }
  }

  const updateFormData = (data: Partial<FormData>) => {
    // Clear error when user makes changes
    if (error) setError(null)
    setFormData((prev) => ({ ...prev, ...data }))
  }

  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm font-medium">{steps[currentStep].name}</span>
        </div>
        <Progress value={isSubmitting ? progress : stepProgress} className="h-2" />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        <CurrentStepComponent formData={formData} updateFormData={updateFormData} />
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handlePrevious} disabled={isFirstStep || isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Previous
        </Button>

        {isLastStep ? (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? `Processing... ${progress}%` : "Submit"}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={isSubmitting}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
