"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Upload, Plus, Trash2 } from "lucide-react"

export default function NewProductPage() {
  const [ingredients, setIngredients] = useState<string[]>([])
  const [newIngredient, setNewIngredient] = useState("")

  const addIngredient = () => {
    if (newIngredient.trim() && !ingredients.includes(newIngredient.trim())) {
      setIngredients([...ingredients, newIngredient.trim()])
      setNewIngredient("")
    }
  }

  const removeIngredient = (ingredient: string) => {
    setIngredients(ingredients.filter((i) => i !== ingredient))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-8">Add New Product</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
                <CardDescription>Enter the basic details about your product.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input id="name" placeholder="e.g. Hydrating Facial Cleanser" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input id="price" type="number" placeholder="29.99" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock Quantity</Label>
                    <Input id="stock" type="number" placeholder="100" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cleanser">Cleanser</SelectItem>
                      <SelectItem value="toner">Toner</SelectItem>
                      <SelectItem value="serum">Serum</SelectItem>
                      <SelectItem value="moisturizer">Moisturizer</SelectItem>
                      <SelectItem value="sunscreen">Sunscreen</SelectItem>
                      <SelectItem value="mask">Mask</SelectItem>
                      <SelectItem value="treatment">Treatment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Describe your product in detail..." rows={5} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ingredients</CardTitle>
                <CardDescription>Add the ingredients in your product.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add an ingredient"
                    value={newIngredient}
                    onChange={(e) => setNewIngredient(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addIngredient()
                      }
                    }}
                  />
                  <Button type="button" onClick={addIngredient}>
                    <Plus className="h-4 w-4 mr-2" /> Add
                  </Button>
                </div>

                {ingredients.length > 0 ? (
                  <div className="border rounded-md p-4">
                    <div className="space-y-2">
                      {ingredients.map((ingredient, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                          <span>{ingredient}</span>
                          <Button variant="ghost" size="sm" onClick={() => removeIngredient(ingredient)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 border rounded-md">No ingredients added yet</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Image</CardTitle>
                <CardDescription>Upload an image of your product.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="p-3 bg-pink-100 rounded-full">
                      <Upload className="h-6 w-6 text-pink-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500">PNG, JPG or JPEG (max. 5MB)</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Select File
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skin Type Suitability</CardTitle>
                <CardDescription>Select which skin types this product is suitable for.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {["All Skin Types", "Oily", "Dry", "Combination", "Sensitive", "Normal", "Mature", "Acne-Prone"].map(
                    (type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox id={`skin-type-${type.toLowerCase()}`} />
                        <Label htmlFor={`skin-type-${type.toLowerCase()}`}>{type}</Label>
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Status</CardTitle>
                <CardDescription>Set the availability of this product.</CardDescription>
              </CardHeader>
              <CardContent>
                <Select defaultValue="active">
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <div className="flex space-x-3">
              <Button className="flex-1">Save Product</Button>
              <Button variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
