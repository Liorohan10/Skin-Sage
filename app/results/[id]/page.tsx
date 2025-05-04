"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Download, Share2, Loader2 } from "lucide-react"
import { ResultsContent } from "@/components/results-content"

export default function ResultsPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<"recommendations" | "analysis" | "routine">("recommendations")
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true)

      // Fetch the PDF from our API endpoint
      const response = await fetch(`/api/pdf/${params.id}`)

      if (!response.ok) {
        throw new Error("Failed to generate PDF")
      }

      // Get the PDF blob
      const pdfBlob = await response.blob()

      // Create a download link and trigger download
      const url = window.URL.createObjectURL(pdfBlob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `skinsage-recommendations-${params.id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()

      // Show success message
      alert("PDF downloaded successfully!")
    } catch (error) {
      console.error("Error downloading PDF:", error)
      alert("Failed to download PDF. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  const handleShareResults = () => {
    // Create a shareable URL
    const shareUrl = `${window.location.origin}/results/${params.id}`

    // Check if Web Share API is available
    if (navigator.share) {
      navigator
        .share({
          title: "My SkinSage Recommendations",
          text: "Check out my personalized skincare recommendations from SkinSage!",
          url: shareUrl,
        })
        .catch((err) => {
          console.error("Error sharing:", err)
          // Fallback to copying to clipboard
          copyToClipboard(shareUrl)
        })
    } else {
      // Fallback for browsers that don't support Web Share API
      copyToClipboard(shareUrl)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Shareable link copied to clipboard!")
      })
      .catch((err) => {
        console.error("Failed to copy:", err)
        alert("Failed to copy link to clipboard.")
      })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
              </Button>
            </Link>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleShareResults}>
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isDownloading}>
                {isDownloading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Downloading...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" /> Save PDF
                  </>
                )}
              </Button>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-8">Your Personalized Skincare Recommendations</h1>

          <Tabs
            defaultValue="recommendations"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "recommendations" | "analysis" | "routine")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="analysis">Skin Analysis</TabsTrigger>
              <TabsTrigger value="routine">Skincare Routine</TabsTrigger>
            </TabsList>

            <ResultsContent resultId={params.id} tab={activeTab} />
          </Tabs>

          <Card className="mt-8 p-6 bg-pink-50 border-pink-200">
            <h3 className="text-lg font-semibold mb-2">Want to save these recommendations?</h3>
            <p className="text-gray-700 mb-4">
              Create an account to save your skincare profile and recommendations for future reference.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="flex-1">Create Account</Button>
              <Button variant="outline" className="flex-1">
                Login
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
