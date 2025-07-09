import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { NewProductForm } from "@/components/admin/new-product-form"

export const dynamic = 'force-dynamic'

export default function NewProductPage() {
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

        <NewProductForm />
      </div>
    </div>
  )
}