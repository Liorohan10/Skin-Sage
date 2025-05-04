import { type NextRequest, NextResponse } from "next/server"
import { generatePDF } from "@/lib/generate-pdf"
import type { ResultsData } from "@/lib/results-store"

// Import the results cache from the results route
import { getStoredResult } from "../../results/[id]/route"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id

  try {
    // Get the results data
    const resultsData = await getStoredResult(id)

    if (!resultsData) {
      return NextResponse.json({ error: "Results not found" }, { status: 404 })
    }

    // Generate the PDF
    const pdfBlob = await generatePDF(resultsData as ResultsData)

    // Return the PDF with appropriate headers
    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="skinsage-recommendations-${id}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating PDF:", error)
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
