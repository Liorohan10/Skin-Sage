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

  // Update the handleSubmit function to use the API
  const handleSubmit = async () => {
    // Clear any previous errors
    setError(null)

    // Validate form
    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)
      setProgress(10)

      // Create form data for API request
      const apiFormData = new FormData()
      apiFormData.append("skinType", formData.skinType)
      apiFormData.append("preferredIngredients", JSON.stringify(formData.preferredIngredients))
      apiFormData.append("avoidIngredients", JSON.stringify(formData.avoidIngredients))
      apiFormData.append("ageRange", formData.ageRange)
      apiFormData.append("budget", formData.budget)
      apiFormData.append("skinConcerns", JSON.stringify(formData.skinConcerns))

      setProgress(30)

      // Add face image if available
      if (formData.faceImage) {
        try {
          // Resize the image to ensure it's not too large for the API
          const resizedImage = await resizeImage(formData.faceImage, 800, 800)
          apiFormData.append("faceImage", resizedImage)
        } catch (imageError) {
          console.error("Error processing image:", imageError)
          // Continue without the image if there's an error
          apiFormData.append("faceImage", formData.faceImage)
        }
      }

      setProgress(50)

      // Send request to API with timeout handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          body: apiFormData,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        setProgress(80)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to analyze skin data")
        }

        const result = await response.json()
        setProgress(90)

        // Add the result to the store
        addResult(result)
        setProgress(100)

        // Navigate to results page
        router.push(`/results/${result.id}`)
      } catch (fetchError) {
        if (fetchError.name === "AbortError") {
          throw new Error("Request timed out. Please try again.")
        }
        throw fetchError
      }
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
