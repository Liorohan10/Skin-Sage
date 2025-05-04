"use client"

import { useState } from "react"
import type { FormData } from "@/components/questionnaire-form"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface IngredientsStepProps {
  formData: FormData
  updateFormData: (data: Partial<FormData>) => void
}

export function IngredientsStep({ formData, updateFormData }: IngredientsStepProps) {
  const [customIngredient, setCustomIngredient] = useState("")

  const commonIngredients = [
    {
      value: "niacinamide",
      label: "Niacinamide",
      description: "Helps minimize pores, improve uneven skin tone, and strengthen the skin barrier.",
    },
    {
      value: "hyaluronic-acid",
      label: "Hyaluronic Acid",
      description: "Hydrates and plumps the skin by helping it retain water.",
    },
    {
      value: "vitamin-c",
      label: "Vitamin C",
      description: "Brightens skin, reduces hyperpigmentation, and boosts collagen production.",
    },
    {
      value: "retinol",
      label: "Retinol",
      description: "Promotes cell turnover, reduces fine lines, and improves skin texture.",
    },
    {
      value: "peptides",
      label: "Peptides",
      description: "Helps build collagen and elastin for firmer, younger-looking skin.",
    },
    {
      value: "ahas",
      label: "AHAs (Glycolic, Lactic Acid)",
      description: "Exfoliates the skin surface, improving texture and tone.",
    },
    {
      value: "bhas",
      label: "BHAs (Salicylic Acid)",
      description: "Penetrates pores to clear out excess oil and dead skin cells.",
    },
  ]

  const handleIngredientToggle = (value: string) => {
    const currentIngredients = [...formData.preferredIngredients]

    if (currentIngredients.includes(value)) {
      updateFormData({
        preferredIngredients: currentIngredients.filter((item) => item !== value),
      })
    } else {
      updateFormData({
        preferredIngredients: [...currentIngredients, value],
      })
    }
  }

  const addCustomIngredient = () => {
    if (customIngredient.trim() && !formData.preferredIngredients.includes(customIngredient.trim())) {
      updateFormData({
        preferredIngredients: [...formData.preferredIngredients, customIngredient.trim()],
      })
      setCustomIngredient("")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Which ingredients do you prefer?</h2>
        <p className="text-gray-600 mb-4">Select ingredients you'd like to include in your skincare routine.</p>
      </div>

      <div className="space-y-3">
        {commonIngredients.map((ingredient) => (
          <div
            key={ingredient.value}
            className={`flex items-start space-x-3 border rounded-lg p-4 transition-colors ${
              formData.preferredIngredients.includes(ingredient.value)
                ? "border-pink-500 bg-pink-50"
                : "border-gray-200"
            }`}
          >
            <Checkbox
              id={`ingredient-${ingredient.value}`}
              checked={formData.preferredIngredients.includes(ingredient.value)}
              onCheckedChange={() => handleIngredientToggle(ingredient.value)}
              className="mt-1"
            />
            <div className="space-y-1.5">
              <Label htmlFor={`ingredient-${ingredient.value}`} className="text-base font-medium cursor-pointer">
                {ingredient.label}
              </Label>
              <p className="text-sm text-gray-600">{ingredient.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t">
        <h3 className="text-base font-medium mb-2">Add custom ingredient</h3>
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

      {formData.preferredIngredients.length > 0 && (
        <div className="pt-4">
          <h3 className="text-base font-medium mb-2">Your selected ingredients:</h3>
          <div className="flex flex-wrap gap-2">
            {formData.preferredIngredients.map((ingredient) => {
              const matchedIngredient = commonIngredients.find((i) => i.value === ingredient)
              const displayName = matchedIngredient ? matchedIngredient.label : ingredient

              return (
                <div key={ingredient} className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm">
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
