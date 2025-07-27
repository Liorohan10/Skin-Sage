"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function DemoPage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testGeminiIntegration = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testImageAnalysis: true })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const testActualGemini = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testImageAnalysis: false })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Gemini AI + Supabase Integration Demo</h1>
        <p className="text-muted-foreground">
          Test the complete skin analysis system with AI-powered recommendations
        </p>
      </div>

      <div className="flex gap-4 justify-center">
        <Button 
          onClick={testGeminiIntegration} 
          disabled={loading}
          variant="outline"
        >
          {loading ? "Testing..." : "Test Demo Analysis"}
        </Button>
        <Button 
          onClick={testActualGemini} 
          disabled={loading}
        >
          {loading ? "Analyzing..." : "Test Actual Gemini AI"}
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {results && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Analysis Results
                <Badge variant={results.success ? "default" : "destructive"}>
                  {results.success ? "Success" : "Failed"}
                </Badge>
              </CardTitle>
              <CardDescription>{results.message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Supabase Connection</h3>
                <p>Found {results.supabaseProducts} products in database</p>
              </div>

              {results.availableProducts && (
                <div>
                  <h3 className="font-semibold mb-2">Sample Products from Database</h3>
                  <div className="grid gap-2">
                    {results.availableProducts.map((product: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span>{product.name} by {product.brand}</span>
                        <Badge variant="secondary">${product.price}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {results.geminiResponse && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">AI Analysis Results</h3>
                  
                  <div>
                    <h4 className="font-medium mb-2">Skin Condition Analysis</h4>
                    <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded">
                      {results.geminiResponse.skinConditionAnalysis}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Recommended Products</h4>
                    <div className="grid gap-3">
                      {results.geminiResponse.recommendedProducts?.map((product: any, index: number) => (
                        <Card key={index} className="p-3">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <h5 className="font-medium">{product.name}</h5>
                              <Badge>{product.price}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{product.description}</p>
                            <div className="text-xs text-gray-600">
                              <strong>Ingredients:</strong> {product.ingredients}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {product.matchReasons?.map((reason: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Morning Routine</h4>
                      <div className="text-sm bg-yellow-50 p-3 rounded whitespace-pre-line">
                        {results.geminiResponse.morningRoutine}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Night Routine</h4>
                      <div className="text-sm bg-purple-50 p-3 rounded whitespace-pre-line">
                        {results.geminiResponse.nightRoutine}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Skincare Advice</h4>
                    <p className="text-sm bg-green-50 p-3 rounded">
                      {results.geminiResponse.skinCareAdvice}
                    </p>
                  </div>
                </div>
              )}

              {results.userProfile && (
                <div>
                  <h4 className="font-medium mb-2">User Profile Used</h4>
                  <div className="text-sm bg-gray-50 p-3 rounded space-y-1">
                    <div><strong>Skin Type:</strong> {results.userProfile.skinType}</div>
                    <div><strong>Age Range:</strong> {results.userProfile.ageRange}</div>
                    <div><strong>Budget:</strong> {results.userProfile.budget}</div>
                    <div><strong>Concerns:</strong> {results.userProfile.concerns?.join(", ")}</div>
                    <div><strong>Preferred Ingredients:</strong> {results.userProfile.preferredIngredients?.join(", ")}</div>
                    <div><strong>Avoid Ingredients:</strong> {results.userProfile.avoidIngredients?.join(", ")}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
