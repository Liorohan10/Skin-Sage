import { type NextRequest, NextResponse } from "next/server"

// In a real application, this would fetch from a database
// For now, we'll simulate with in-memory storage
const resultsCache = new Map()

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id

  try {
    // In a real app, fetch from database
    // For demo, check if we have cached results or return mock data
    const result = await getStoredResult(id)

    if (result) {
      return NextResponse.json(result)
    }

    // If no cached result, return a 404
    return NextResponse.json({ error: "Results not found" }, { status: 404 })
  } catch (error) {
    console.error("Error fetching results:", error)
    return NextResponse.json(
      { error: "Failed to fetch results", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

// This function would be called after analysis to store results
export function storeResults(id: string, data: any) {
  resultsCache.set(id, data)
}

// Export this function to be used by other routes
export async function getStoredResult(id: string) {
  return resultsCache.get(id)
}
