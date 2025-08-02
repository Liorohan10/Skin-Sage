import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading SkinSage</h2>
        <p className="text-gray-600">Preparing your personalized skincare experience...</p>
      </div>
    </div>
  )
}