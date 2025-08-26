"use client"

import type { FormData } from "@/components/questionnaire-form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface BudgetStepProps {
  formData: FormData
  updateFormData: (data: Partial<FormData>) => void
}

export function BudgetStep({ formData, updateFormData }: BudgetStepProps) {
  const budgetRanges = [
    {
      value: "budget",
      label: "Budget-Friendly",
  description: "Affordable options for everyday use",
    },
    {
      value: "mid-tier",
      label: "Mid-Tier",
  description: "Quality products with effective, dermatologist-tested ingredients",
    },
    {
      value: "premium",
      label: "Premium",
  description: "High-end products with advanced formulations from premium brands",
    },
    {
      value: "mixed",
      label: "Mixed Budget",
  description: "Flexible mix across Budget, Mid-Tier, and Premium options",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">What is your budget preference?</h2>
        <p className="text-gray-600 mb-4">This helps us recommend products that fit your price range.</p>
      </div>

      <RadioGroup
        value={formData.budget}
        onValueChange={(value) => updateFormData({ budget: value })}
        className="space-y-3"
      >
        {budgetRanges.map((range) => (
          <div
            key={range.value}
            className={`flex items-start space-x-3 border rounded-lg p-4 transition-colors ${
              formData.budget === range.value ? "border-pink-500 bg-pink-50" : "border-gray-200"
            }`}
          >
            <RadioGroupItem value={range.value} id={`budget-${range.value}`} className="mt-1" />
            <div className="space-y-1.5">
              <Label htmlFor={`budget-${range.value}`} className="text-base font-medium cursor-pointer">
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
