import { jsPDF } from "jspdf"
import type { ResultsData } from "./results-store"

export async function generatePDF(data: ResultsData): Promise<Blob> {
  // Create a new PDF document
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  // Add logo/header
  doc.setFillColor(247, 212, 232) // Light pink
  doc.rect(0, 0, 210, 25, "F")
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("SkinSage", 15, 15)
  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text("Personalized Skincare Recommendations", 60, 15)

  // Add date
  const date = new Date().toLocaleDateString()
  doc.setFontSize(10)
  doc.text(`Generated on: ${date}`, 150, 15)

  // Add user profile section
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("Your Skin Profile", 15, 35)

  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.text(`Skin Type: ${data.userProfile?.skinType || "Not specified"}`, 15, 45)
  doc.text(`Age Range: ${data.userProfile?.ageRange || "Not specified"}`, 15, 52)

  // Add concerns if available
  if (data.userProfile?.concerns && data.userProfile.concerns.length > 0) {
    doc.text(`Skin Concerns: ${data.userProfile.concerns.join(", ")}`, 15, 59)
  }

  // Add skin analysis section
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("Skin Analysis", 15, 75)

  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")

  // Handle long text with wrapping
  const splitAnalysis = doc.splitTextToSize(data.skinConditionAnalysis, 180)
  doc.text(splitAnalysis, 15, 85)

  // Add skincare advice if available
  if (data.skinCareAdvice) {
    const yPos = 85 + splitAnalysis.length * 7
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("Personalized Advice", 15, yPos)

    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    const splitAdvice = doc.splitTextToSize(data.skinCareAdvice, 180)
    doc.text(splitAdvice, 15, yPos + 10)
  }

  // Add recommended products section
  doc.addPage()
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("Recommended Products", 15, 20)

  let yPosition = 30

  // Add each product
  data.recommendedProducts.forEach((product, index) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text(`${index + 1}. ${product.name}`, 15, yPosition)
    yPosition += 7

    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    doc.text(`Price: ${product.price}`, 20, yPosition)
    yPosition += 6

    const splitDescription = doc.splitTextToSize(product.description, 170)
    doc.text(splitDescription, 20, yPosition)
    yPosition += splitDescription.length * 6

    doc.text(`Key Ingredients: ${product.ingredients}`, 20, yPosition)
    yPosition += 6

    doc.text(`Suitable for: ${product.suitableFor}`, 20, yPosition)
    yPosition += 10

    // Add match reasons if available
    if (product.matchReasons && product.matchReasons.length > 0) {
      doc.text("Why this matches your profile:", 20, yPosition)
      yPosition += 6

      product.matchReasons.forEach((reason) => {
        doc.text(`• ${reason}`, 25, yPosition)
        yPosition += 6
      })

      yPosition += 4
    }
  })

  // Add skincare routine section
  doc.addPage()
  yPosition = 20

  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("Your Skincare Routine", 15, yPosition)
  yPosition += 10

  // Morning routine
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("Morning Routine:", 15, yPosition)
  yPosition += 8

  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")

  const morningSteps = data.morningRoutine.split("\n")
  morningSteps.forEach((step) => {
    doc.text(step, 20, yPosition)
    yPosition += 6
  })

  yPosition += 5

  // Night routine
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("Evening Routine:", 15, yPosition)
  yPosition += 8

  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")

  const nightSteps = data.nightRoutine.split("\n")
  nightSteps.forEach((step) => {
    doc.text(step, 20, yPosition)
    yPosition += 6
  })

  // Add footer
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text("© SkinSage - AI-powered skincare recommendations", 15, 285)
  doc.text("www.skinsage.com", 160, 285)

  // Return the PDF as a blob
  return doc.output("blob")
}
