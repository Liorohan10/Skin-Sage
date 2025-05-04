import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminProductList } from "@/components/admin/admin-product-list"
import { AdminDashboardStats } from "@/components/admin/admin-dashboard-stats"
import { AdminConsultationsList } from "@/components/admin/admin-consultations-list"
import { AdminLoading } from "@/components/admin/admin-loading"
import { ArrowLeft, LayoutDashboard, Package, Users, Settings } from "lucide-react"

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="hidden md:flex w-64 flex-col fixed inset-y-0 bg-white border-r">
          <div className="p-4 border-b">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                <span className="font-bold text-pink-600">S</span>
              </div>
              <span className="font-bold text-lg">SkinSage Admin</span>
            </div>
          </div>
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              <li>
                <Link
                  href="/admin"
                  className="flex items-center space-x-3 px-3 py-2 rounded-md bg-pink-50 text-pink-700"
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span>Dashboard</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/products"
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  <Package className="h-5 w-5" />
                  <span>Products</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/consultations"
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  <Users className="h-5 w-5" />
                  <span>Consultations</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/settings"
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </Link>
              </li>
            </ul>
          </nav>
          <div className="p-4 border-t">
            <Link href="/">
              <Button variant="outline" size="sm" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Site
              </Button>
            </Link>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 md:ml-64">
          <header className="bg-white border-b p-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-right">
                  <div className="font-medium">Brand Admin</div>
                  <div className="text-gray-500">admin@example.com</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-200"></div>
              </div>
            </div>
          </header>

          <main className="p-6">
            <Suspense fallback={<AdminLoading />}>
              <AdminDashboardStats />
            </Suspense>

            <Tabs defaultValue="products" className="mt-8">
              <TabsList>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="consultations">Recent Consultations</TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="mt-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Product Catalog</CardTitle>
                      <CardDescription>Manage your product catalog and inventory</CardDescription>
                    </div>
                    <Link href="/admin/products/new">
                      <Button>Add Product</Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<AdminLoading />}>
                      <AdminProductList />
                    </Suspense>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="consultations" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Consultations</CardTitle>
                    <CardDescription>View and manage customer consultations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<AdminLoading />}>
                      <AdminConsultationsList />
                    </Suspense>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  )
}
