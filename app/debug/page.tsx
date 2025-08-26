"use client"

import { useResultsStore } from "@/lib/results-store"
import { useEffect, useState } from "react"

export default function DebugPage() {
  const results = useResultsStore((state) => state.results)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Store Contents</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Store Status</h2>
          <p>Results Count: {Object.keys(results).length}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Stored Result IDs</h2>
          <ul className="list-disc list-inside">
            {Object.keys(results).map((id) => (
              <li key={id}>
                <a href={`/results/${id}`} className="text-blue-600 hover:underline">
                  {id}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Raw Store Data</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
