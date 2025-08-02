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

// Set your backend URL here for local development
const BACKEND_URL = "http://127.0.0.1:8000"

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

  // Update to use the Next.js API route with Gemini AI integration
  const handleSubmit = async () => {
    setError(null)
    if (!validateForm()) return
    
    try {
      setIsSubmitting(true)
      setProgress(20)

      // Create FormData for the Next.js API route
      const submitData = new FormData()
      submitData.append("skinType", formData.skinType)
      submitData.append("preferredIngredients", JSON.stringify(formData.preferredIngredients))
      submitData.append("avoidIngredients", JSON.stringify(formData.avoidIngredients))
      submitData.append("ageRange", formData.ageRange)
      submitData.append("budget", formData.budget)
      submitData.append("skinConcerns", JSON.stringify(formData.skinConcerns))
      
      // Add face image if provided for Gemini vision analysis
      if (formData.faceImage) {
        // Resize image before sending to reduce payload size
        const resizedImage = await resizeImage(formData.faceImage, 800, 800)
        submitData.append("faceImage", resizedImage)
      }

      setProgress(40)

      // Add validation for required fields
      const requiredFields = ['skinType', 'ageRange', 'budget']
      const missingFields = requiredFields.filter(field => !formData[field as keyof FormData])
      
      if (missingFields.length > 0) {
        throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`)
      }

      // Validate ingredients arrays
      if (formData.preferredIngredients.length === 0) {
        throw new Error("Please select at least one preferred ingredient")
      }

      setProgress(50)

      console.log("Submitting questionnaire data:", {
        skinType: formData.skinType,
        ageRange: formData.ageRange,
        budget: formData.budget,
        preferredIngredients: formData.preferredIngredients.length,
        avoidIngredients: formData.avoidIngredients.length,
        skinConcerns: formData.skinConcerns.length,
        hasImage: !!formData.faceImage
      })

      // Call the Next.js API route with enhanced error handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        setError("Request timed out. Please try again.")
      }, 60000) // 60 second timeout

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          body: submitData,
          signal: controller.signal
        })

        clearTimeout(timeoutId)
        setProgress(80)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error occurred" }))
          throw new Error(errorData.error || `Server error: ${response.status}`)
        }

        const result = await response.json()
        console.log("Analysis result received:", {
          id: result.id,
          hasAnalysis: !!result.skinConditionAnalysis,
          hasProducts: !!result.recommendedProducts,
          productCount: result.recommendedProducts?.length || 0,
          hasRoutine: !!(result.routine || result.morningRoutine),
          source: result.source
        })

        setProgress(90)

        // Validate result structure
        if (!result.id) {
          throw new Error("Invalid response: missing analysis ID")
        }

        if (!result.skinConditionAnalysis) {
          throw new Error("Invalid response: missing skin analysis")
        }

        // Store the result
        addResult(result)
        setProgress(100)
        
        // Small delay to show completion
        setTimeout(() => {
          router.push(`/results/${result.id}`)
        }, 500)
        
      } finally {
        clearTimeout(timeoutId)
      }
      
    } catch (error) {
      console.error("Error submitting questionnaire:", error)
      
      // Provide more specific error messages
      let errorMessage = "An unexpected error occurred. Please try again."
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Request timed out. Please check your internet connection and try again."
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "Unable to connect to the server. Please check your internet connection."
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
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
