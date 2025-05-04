"use client"

import type { FormData } from "@/components/questionnaire-form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface SkinTypeStepProps {
  formData: FormData
  updateFormData: (data: Partial<FormData>) => void
}

export function SkinTypeStep({ formData, updateFormData }: SkinTypeStepProps) {
  const skinTypes = [
    {
      value: "oily",
      label: "Oily",
      description: "Skin that produces excess sebum, often appears shiny, and is prone to acne and enlarged pores.",
    },
    {
      value: "dry",
      label: "Dry",
      description: "Skin that produces less sebum, feels tight, and may have flaky patches or rough texture.",
    },
    {
      value: "combination",
      label: "Combination",
      description: "Skin that is oily in some areas (typically the T-zone) and dry in others.",
    },
    {
      value: "sensitive",
      label: "Sensitive",
      description: "Skin that reacts easily to products or environmental factors with redness, itching, or burning.",
    },
    {
      value: "normal",
      label: "Normal",
      description: "Well-balanced skin that is neither too oily nor too dry, with few imperfections.",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">What is your skin type?</h2>
        <p className="text-gray-600 mb-4">Select the option that best describes your skin's natural state.</p>
      </div>

      <RadioGroup
        value={formData.skinType}
        onValueChange={(value) => updateFormData({ skinType: value })}
        className="space-y-3"
      >
        {skinTypes.map((type) => (
          <div
            key={type.value}
            className={`flex items-start space-x-3 border rounded-lg p-4 transition-colors ${
              formData.skinType === type.value ? "border-pink-500 bg-pink-50" : "border-gray-200"
            }`}
          >
            <RadioGroupItem value={type.value} id={`skin-type-${type.value}`} className="mt-1" />
            <div className="space-y-1.5">
              <Label htmlFor={`skin-type-${type.value}`} className="text-base font-medium cursor-pointer">
                {type.label}
              </Label>
              <p className="text-sm text-gray-600">{type.description}</p>
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
