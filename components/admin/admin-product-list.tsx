"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Search, Filter, ArrowUpDown } from "lucide-react"

interface Product {
  id: string
  name: string
  category: string
  price: string
  stock: number
  status: "active" | "inactive"
  skinTypes: string[]
}

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Gentle Foaming Cleanser",
    category: "Cleanser",
    price: "$24.99",
    stock: 45,
    status: "active",
    skinTypes: ["All", "Sensitive", "Combination"],
  },
  {
    id: "2",
    name: "Niacinamide 10% Serum",
    category: "Serum",
    price: "$19.99",
    stock: 32,
    status: "active",
    skinTypes: ["Oily", "Combination"],
  },
  {
    id: "3",
    name: "Hyaluronic Acid Serum",
    category: "Serum",
    price: "$22.99",
    stock: 28,
    status: "active",
    skinTypes: ["All", "Dry", "Dehydrated"],
  },
  {
    id: "4",
    name: "Balancing Moisturizer",
    category: "Moisturizer",
    price: "$29.99",
    stock: 19,
    status: "active",
    skinTypes: ["Combination"],
  },
  {
    id: "5",
    name: "Mineral Sunscreen SPF 50",
    category: "Sunscreen",
    price: "$32.99",
    stock: 37,
    status: "active",
    skinTypes: ["All", "Sensitive"],
  },
  {
    id: "6",
    name: "Retinol Night Cream",
    category: "Treatment",
    price: "$45.99",
    stock: 0,
    status: "inactive",
    skinTypes: ["Mature", "Normal"],
  },
  {
    id: "7",
    name: "Vitamin C Brightening Serum",
    category: "Serum",
    price: "$38.99",
    stock: 12,
    status: "active",
    skinTypes: ["All", "Hyperpigmented"],
  },
]

export function AdminProductList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  const filteredProducts = mockProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  const toggleAllProducts = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(filteredProducts.map((product) => product.id))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search products..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                  onCheckedChange={toggleAllProducts}
                />
              </TableHead>
              <TableHead>
                <div className="flex items-center space-x-1">
                  <span>Product</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Skin Types</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={() => toggleProductSelection(product.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.price}</TableCell>
                  <TableCell>
                    <span className={product.stock === 0 ? "text-red-600 font-medium" : ""}>{product.stock}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.status === "active" ? "default" : "secondary"}>{product.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {product.skinTypes.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
