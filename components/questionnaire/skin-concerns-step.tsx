"use client"

import type { FormData } from "@/components/questionnaire-form"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface SkinConcernsStepProps {
  formData: FormData
  updateFormData: (data: Partial<FormData>) => void
}

export function SkinConcernsStep({ formData, updateFormData }: SkinConcernsStepProps) {
  const skinConcerns = [
    {
      value: "acne",
      label: "Acne",
      description: "Breakouts, pimples, and clogged pores.",
    },
    {
      value: "aging",
      label: "Signs of Aging",
      description: "Fine lines, wrinkles, and loss of firmness.",
    },
    {
      value: "dryness",
      label: "Dryness",
      description: "Flaky, tight, or rough skin that lacks moisture.",
    },
    {
      value: "dullness",
      label: "Dullness",
      description: "Lack of radiance and uneven skin tone.",
    },
    {
      value: "hyperpigmentation",
      label: "Hyperpigmentation",
      description: "Dark spots, sun damage, and uneven skin tone.",
    },
    {
      value: "redness",
      label: "Redness",
      description: "Persistent redness or flushing of the skin.",
    },
    {
      value: "sensitivity",
      label: "Sensitivity",
      description: "Skin that reacts easily to products or environmental factors.",
    },
    {
      value: "oiliness",
      label: "Excess Oil",
      description: "Shiny skin and enlarged pores.",
    },
    {
      value: "texture",
      label: "Uneven Texture",
      description: "Rough or bumpy skin surface.",
    },
    {
      value: "dehydration",
      label: "Dehydration",
      description: "Lack of water in the skin, can occur in any skin type.",
    },
  ]

  const handleConcernToggle = (value: string) => {
    const currentConcerns = [...(formData.skinConcerns || [])]

    if (currentConcerns.includes(value)) {
      updateFormData({
        skinConcerns: currentConcerns.filter((item) => item !== value),
      })
    } else {
      updateFormData({
        skinConcerns: [...currentConcerns, value],
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">What are your main skin concerns?</h2>
        <p className="text-gray-600 mb-4">
          Select the issues you'd like to address with your skincare routine. You can select multiple options.
        </p>
      </div>

      <div className="space-y-3">
        {skinConcerns.map((concern) => (
          <div
            key={concern.value}
            className={`flex items-start space-x-3 border rounded-lg p-4 transition-colors ${
              formData.skinConcerns?.includes(concern.value) ? "border-pink-500 bg-pink-50" : "border-gray-200"
            }`}
          >
            <Checkbox
              id={`concern-${concern.value}`}
              checked={formData.skinConcerns?.includes(concern.value)}
              onCheckedChange={() => handleConcernToggle(concern.value)}
              className="mt-1"
            />
            <div className="space-y-1.5">
              <Label htmlFor={`concern-${concern.value}`} className="text-base font-medium cursor-pointer">
                {concern.label}
              </Label>
              <p className="text-sm text-gray-600">{concern.description}</p>
            </div>
          </div>
        ))}
      </div>

      {formData.skinConcerns && formData.skinConcerns.length > 0 && (
        <div className="pt-4">
          <h3 className="text-base font-medium mb-2">Your selected concerns:</h3>
          <div className="flex flex-wrap gap-2">
            {formData.skinConcerns.map((concern) => {
              const matchedConcern = skinConcerns.find((c) => c.value === concern)
              const displayName = matchedConcern ? matchedConcern.label : concern

              return (
                <div key={concern} className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm">
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
