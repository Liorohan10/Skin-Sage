"use client"

import { useState } from "react"
import type { FormData } from "@/components/questionnaire-form"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface AvoidIngredientsStepProps {
  formData: FormData
  updateFormData: (data: Partial<FormData>) => void
}

export function AvoidIngredientsStep({ formData, updateFormData }: AvoidIngredientsStepProps) {
  const [customIngredient, setCustomIngredient] = useState("")

  const commonAllergens = [
    {
      value: "fragrance",
      label: "Fragrance/Parfum",
      description: "Synthetic fragrances can cause irritation and allergic reactions.",
    },
    {
      value: "alcohol",
      label: "Alcohol (Denatured)",
      description: "Can be drying and irritating, especially for sensitive skin.",
    },
    {
      value: "essential-oils",
      label: "Essential Oils",
      description: "Natural but can cause sensitization and irritation.",
    },
    {
      value: "sulfates",
      label: "Sulfates (SLS/SLES)",
      description: "Harsh cleansing agents that can strip the skin of natural oils.",
    },
    {
      value: "parabens",
      label: "Parabens",
      description: "Preservatives that some people prefer to avoid.",
    },
    {
      value: "mineral-oil",
      label: "Mineral Oil",
      description: "Petroleum-derived ingredient that can clog pores for some people.",
    },
    {
      value: "silicones",
      label: "Silicones",
      description: "Can create a barrier that traps debris for some skin types.",
    },
  ]

  const handleIngredientToggle = (value: string) => {
    const currentIngredients = [...formData.avoidIngredients]

    if (currentIngredients.includes(value)) {
      updateFormData({
        avoidIngredients: currentIngredients.filter((item) => item !== value),
      })
    } else {
      updateFormData({
        avoidIngredients: [...currentIngredients, value],
      })
    }
  }

  const addCustomIngredient = () => {
    if (customIngredient.trim() && !formData.avoidIngredients.includes(customIngredient.trim())) {
      updateFormData({
        avoidIngredients: [...formData.avoidIngredients, customIngredient.trim()],
      })
      setCustomIngredient("")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Which ingredients do you want to avoid?</h2>
        <p className="text-gray-600 mb-4">
          Select ingredients you'd like to avoid due to allergies, sensitivities, or personal preference.
        </p>
      </div>

      <div className="space-y-3">
        {commonAllergens.map((ingredient) => (
          <div
            key={ingredient.value}
            className={`flex items-start space-x-3 border rounded-lg p-4 transition-colors ${
              formData.avoidIngredients.includes(ingredient.value) ? "border-pink-500 bg-pink-50" : "border-gray-200"
            }`}
          >
            <Checkbox
              id={`avoid-${ingredient.value}`}
              checked={formData.avoidIngredients.includes(ingredient.value)}
              onCheckedChange={() => handleIngredientToggle(ingredient.value)}
              className="mt-1"
            />
            <div className="space-y-1.5">
              <Label htmlFor={`avoid-${ingredient.value}`} className="text-base font-medium cursor-pointer">
                {ingredient.label}
              </Label>
              <p className="text-sm text-gray-600">{ingredient.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t">
        <h3 className="text-base font-medium mb-2">Add custom ingredient to avoid</h3>
        <div className="flex space-x-2">
          <Input
            value={customIngredient}
            onChange={(e) => setCustomIngredient(e.target.value)}
            placeholder="Enter ingredient name"
            className="flex-1"
          />
          <Button type="button" onClick={addCustomIngredient} disabled={!customIngredient.trim()}>
            <Plus className="h-4 w-4 mr-2" /> Add
          </Button>
        </div>
      </div>

      {formData.avoidIngredients.length > 0 && (
        <div className="pt-4">
          <h3 className="text-base font-medium mb-2">Ingredients you want to avoid:</h3>
          <div className="flex flex-wrap gap-2">
            {formData.avoidIngredients.map((ingredient) => {
              const matchedIngredient = commonAllergens.find((i) => i.value === ingredient)
              const displayName = matchedIngredient ? matchedIngredient.label : ingredient

              return (
                <div key={ingredient} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                  {displayName}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
