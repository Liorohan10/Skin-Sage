"use client"

import type { FormData } from "@/components/questionnaire-form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface AgeRangeStepProps {
  formData: FormData
  updateFormData: (data: Partial<FormData>) => void
}

export function AgeRangeStep({ formData, updateFormData }: AgeRangeStepProps) {
  const ageRanges = [
    {
      value: "under-18",
      label: "Under 18",
      description: "Teenage skin with specific needs.",
    },
    {
      value: "18-24",
      label: "18-24",
      description: "Young adult skin, often dealing with hormonal changes.",
    },
    {
      value: "25-34",
      label: "25-34",
      description: "Early signs of aging may begin to appear.",
    },
    {
      value: "35-44",
      label: "35-44",
      description: "Fine lines and wrinkles may become more noticeable.",
    },
    {
      value: "45-54",
      label: "45-54",
      description: "Skin elasticity decreases, deeper wrinkles may form.",
    },
    {
      value: "55-plus",
      label: "55+",
      description: "Mature skin with focus on hydration and firmness.",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">What is your age range?</h2>
        <p className="text-gray-600 mb-4">
          This helps us recommend products appropriate for your skin's needs at different life stages.
        </p>
      </div>

      <RadioGroup
        value={formData.ageRange}
        onValueChange={(value) => updateFormData({ ageRange: value })}
        className="space-y-3"
      >
        {ageRanges.map((range) => (
          <div
            key={range.value}
            className={`flex items-start space-x-3 border rounded-lg p-4 transition-colors ${
              formData.ageRange === range.value ? "border-pink-500 bg-pink-50" : "border-gray-200"
            }`}
          >
            <RadioGroupItem value={range.value} id={`age-range-${range.value}`} className="mt-1" />
            <div className="space-y-1.5">
              <Label htmlFor={`age-range-${range.value}`} className="text-base font-medium cursor-pointer">
                {range.label}
              </Label>
              <p className="text-sm text-gray-600">{range.description}</p>
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
