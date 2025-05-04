"use client"

import type { FormData } from "@/components/questionnaire-form"
import { Card } from "@/components/ui/card"
import { Check, AlertCircle } from "lucide-react"

interface ReviewStepProps {
  formData: FormData
  updateFormData: (data: Partial<FormData>) => void
}

export function ReviewStep({ formData }: ReviewStepProps) {
  const getSkinTypeLabel = (value: string) => {
    const types: Record<string, string> = {
      oily: "Oily",
      dry: "Dry",
      combination: "Combination",
      sensitive: "Sensitive",
      normal: "Normal",
    }
    return types[value] || value
  }

  const getBudgetLabel = (value: string) => {
    const budgets: Record<string, string> = {
      budget: "Budget-Friendly",
      "mid-tier": "Mid-Tier",
      premium: "Premium",
      mixed: "Mixed Budget",
    }
    return budgets[value] || value
  }

  const getAgeRangeLabel = (value: string) => {
    const ranges: Record<string, string> = {
      "under-18": "Under 18",
      "18-24": "18-24",
      "25-34": "25-34",
      "35-44": "35-44",
      "45-54": "45-54",
      "55-plus": "55+",
    }
    return ranges[value] || value
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Review Your Information</h2>
        <p className="text-gray-600 mb-4">
          Please review your answers before submitting. You can go back to make changes if needed.
        </p>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="font-medium text-lg mb-2">Skin Type</h3>
          {formData.skinType ? (
            <div className="flex items-center text-green-600">
              <Check className="h-5 w-5 mr-2" />
              <span>{getSkinTypeLabel(formData.skinType)}</span>
            </div>
          ) : (
            <div className="flex items-center text-amber-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>Not specified</span>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-medium text-lg mb-2">Preferred Ingredients</h3>
          {formData.preferredIngredients.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {formData.preferredIngredients.map((ingredient) => (
                <span key={ingredient} className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm">
                  {ingredient}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex items-center text-amber-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>No preferred ingredients selected</span>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-medium text-lg mb-2">Ingredients to Avoid</h3>
          {formData.avoidIngredients.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {formData.avoidIngredients.map((ingredient) => (
                <span key={ingredient} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                  {ingredient}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex items-center text-amber-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>No ingredients to avoid specified</span>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-medium text-lg mb-2">Facial Image</h3>
          {formData.faceImagePreview ? (
            <div className="flex items-center text-green-600">
              <Check className="h-5 w-5 mr-2" />
              <span>Image uploaded</span>
            </div>
          ) : (
            <div className="flex items-center text-amber-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>No image uploaded (optional)</span>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-medium text-lg mb-2">Age Range</h3>
          {formData.ageRange ? (
            <div className="flex items-center text-green-600">
              <Check className="h-5 w-5 mr-2" />
              <span>{getAgeRangeLabel(formData.ageRange)}</span>
            </div>
          ) : (
            <div className="flex items-center text-amber-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>Not specified</span>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-medium text-lg mb-2">Budget Preference</h3>
          {formData.budget ? (
            <div className="flex items-center text-green-600">
              <Check className="h-5 w-5 mr-2" />
              <span>{getBudgetLabel(formData.budget)}</span>
            </div>
          ) : (
            <div className="flex items-center text-amber-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>Not specified</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
