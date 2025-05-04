"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, CheckCircle2, Clock, ThumbsUp, Info } from "lucide-react"
import { ResultsLoading } from "./results-loading"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useResultsStore, type ResultsData } from "@/lib/results-store"

interface ResultsContentProps {
  resultId: string
  tab: "recommendations" | "analysis" | "routine"
}

interface EnhancedProduct {
  name: string
  description: string
  price: string
  ingredients: string
  suitableFor: string
  matchReasons?: string[]
}

interface EnhancedResultsData extends ResultsData {
  recommendedProducts: EnhancedProduct[]
}

export function ResultsContent({ resultId, tab }: ResultsContentProps) {
  const router = useRouter()
  const getResult = useResultsStore((state) => state.getResult)
  const [data, setData] = useState<EnhancedResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get the result from the store
    const result = getResult(resultId)

    if (result) {
      setData(result as EnhancedResultsData)
    } else {
      setError("Results not found. Please try starting a new consultation.")
    }

    setLoading(false)
  }, [resultId, getResult])

  if (loading) {
    return <ResultsLoading />
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Error Loading Results</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <div className="flex justify-center space-x-4">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
          <Button onClick={() => router.push("/questionnaire")}>Start New Consultation</Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Results Not Found</h3>
        <p className="text-gray-600 mb-4">We couldn't find the recommendations you're looking for.</p>
        <Button onClick={() => router.push("/questionnaire")}>Start New Consultation</Button>
      </div>
    )
  }

  if (tab === "recommendations") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-4">Recommended Products</h2>
        <p className="text-gray-600 mb-6">
          Based on your skin profile, we recommend the following products that are suitable for your skin type,
          preferences, and budget.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.recommendedProducts.map((product, index) => (
            <Card key={index} className="p-4 h-full flex flex-col">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">{product.name}</h3>
                <p className="text-pink-600 font-medium mb-3">{product.price}</p>
                <p className="text-gray-700 mb-3">{product.description}</p>
                <div className="mt-auto">
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Suitable for:</span> {product.suitableFor}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Key ingredients:</span> {product.ingredients}
                  </div>

                  {/* Display match reasons */}
                  {product.matchReasons && product.matchReasons.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <h4 className="text-sm font-medium mb-2 flex items-center">
                        <ThumbsUp className="h-4 w-4 mr-1 text-green-600" />
                        Why this matches your profile:
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {product.matchReasons.map((reason, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-green-600 mr-1.5">•</span> {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                  Recommended
                </Badge>
                <button className="text-pink-600 text-sm font-medium hover:underline">View Details</button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (tab === "analysis") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-4">Skin Condition Analysis</h2>
        <Card className="p-6">
          <div className="flex items-start space-x-4 mb-6">
            <div className="bg-pink-100 p-2 rounded-full">
              <CheckCircle2 className="h-6 w-6 text-pink-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Analysis Results</h3>
              <p className="text-gray-700">{data.skinConditionAnalysis}</p>
            </div>
          </div>

          {data.skinCareAdvice && (
            <>
              <Separator className="my-6" />
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Info className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Personalized Advice</h3>
                  <p className="text-gray-700">{data.skinCareAdvice}</p>
                </div>
              </div>
            </>
          )}

          <Separator className="my-6" />

          <div>
            <h3 className="text-lg font-semibold mb-4">Key Observations</h3>
            <ul className="space-y-3">
              {data.userProfile?.concerns?.map((concern, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{concern}</span>
                </li>
              ))}
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>
                  {data.userProfile?.skinType} skin type with specific needs for your {data.userProfile?.ageRange} age
                  range
                </span>
              </li>
            </ul>
          </div>
        </Card>
      </div>
    )
  }

  if (tab === "routine") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-4">Recommended Skincare Routine</h2>
        <p className="text-gray-600 mb-6">
          Follow this personalized routine consistently for best results. Adjust as needed based on how your skin
          responds.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-amber-100 p-2 rounded-full">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold">Morning Routine</h3>
            </div>

            <ol className="space-y-4 mt-4">
              {data.morningRoutine.split("\n").map((step, index) => (
                <li key={index} className="flex items-start">
                  <span className="bg-pink-100 text-pink-800 w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    {index + 1}
                  </span>
                  <span>{step.substring(step.indexOf(". ") + 2)}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-indigo-100 p-2 rounded-full">
                <Clock className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold">Evening Routine</h3>
            </div>

            <ol className="space-y-4 mt-4">
              {data.nightRoutine.split("\n").map((step, index) => (
                <li key={index} className="flex items-start">
                  <span className="bg-pink-100 text-pink-800 w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    {index + 1}
                  </span>
                  <span>{step.substring(step.indexOf(". ") + 2)}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold mb-2">Weekly Treatments</h3>
          <p className="text-gray-700 mb-4">In addition to your daily routine, consider these weekly treatments:</p>
          <ul className="space-y-3">
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Gentle exfoliation 1-2 times per week to remove dead skin cells</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Hydrating mask once per week, focusing on dry areas</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Clay mask on oily areas once per week to control excess sebum</span>
            </li>
          </ul>
        </Card>
      </div>
    )
  }

  return null
}
