import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle, Clock } from "lucide-react"

async function checkBackendHealth() {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/recommend-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skin_type: 'normal',
        age_group: '25-34',
        skin_concerns: ['test'],
        price_range: [100, 1000],
        ingredients: [],
        avoid_ingredients: []
      })
    })
    return { status: response.ok ? 'healthy' : 'error', details: response.status }
  } catch (error) {
    return { status: 'error', details: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function checkSupabaseHealth() {
  try {
    const response = await fetch('/api/test-supabase')
    const data = await response.json()
    return { 
      status: response.ok ? 'healthy' : 'error', 
      details: response.ok ? `${data.productCount} products` : data.error 
    }
  } catch (error) {
    return { status: 'error', details: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export default async function HealthPage() {
  const backendHealth = await checkBackendHealth()
  const supabaseHealth = await checkSupabaseHealth()

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Healthy</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">System Health Status</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(backendHealth.status)}
              Python Backend
            </CardTitle>
            <CardDescription>AI recommendation engine and product database</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              {getStatusBadge(backendHealth.status)}
              <span className="text-sm text-gray-600">{backendHealth.details}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(supabaseHealth.status)}
              Supabase Database
            </CardTitle>
            <CardDescription>Product catalog and user data storage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              {getStatusBadge(supabaseHealth.status)}
              <span className="text-sm text-gray-600">{supabaseHealth.details}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Frontend:</span>
              <p className="text-gray-600">Next.js 15</p>
            </div>
            <div>
              <span className="font-medium">AI Model:</span>
              <p className="text-gray-600">Gemini 2.0 Flash</p>
            </div>
            <div>
              <span className="font-medium">Backend:</span>
              <p className="text-gray-600">FastAPI + Python</p>
            </div>
            <div>
              <span className="font-medium">Database:</span>
              <p className="text-gray-600">Supabase PostgreSQL</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}