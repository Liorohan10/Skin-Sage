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
        submitData.append("faceImage", formData.faceImage)
      }

      setProgress(50)

      // Call the Next.js API route with Gemini AI integration
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: submitData,
      })

      setProgress(80)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to get AI analysis")
      }

      const result = await response.json()
      console.log("Gemini AI analysis result:", result) // Debug log

      setProgress(90)

      // Store the result (it's already in the correct format from the API)
      addResult(result)
      
      setProgress(100)
      router.push(`/results/${result.id}`)
      
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
