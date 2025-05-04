"use client"

import type React from "react"
import { useState, useRef } from "react"
import type { FormData } from "@/components/questionnaire-form"
import { Button } from "@/components/ui/button"
import { Upload, X, Camera } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { resizeImage } from "@/lib/image-utils"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ImageUploadStepProps {
  formData: FormData
  updateFormData: (data: Partial<FormData>) => void
}

export function ImageUploadStep({ formData, updateFormData }: ImageUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Handle file selection
  const handleFileChange = async (file: File | null) => {
    // Clear any previous errors
    setUploadError(null)

    if (file) {
      try {
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          setUploadError("Image size exceeds 5MB limit. Please choose a smaller image.")
          return
        }

        // Check file type
        if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
          setUploadError("Only JPG, JPEG, and PNG images are supported.")
          return
        }

        // Resize the image before creating preview
        const resizedFile = await resizeImage(file)

        // Create a preview URL for the image
        const previewUrl = URL.createObjectURL(resizedFile)

        updateFormData({
          faceImage: resizedFile,
          faceImagePreview: previewUrl,
        })
      } catch (error) {
        console.error("Error processing image:", error)
        setUploadError("Failed to process the image. Please try another one.")
      }
    }
  }

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0])
    }
  }

  // Remove the selected image
  const removeImage = () => {
    updateFormData({
      faceImage: null,
      faceImagePreview: null,
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Camera capture functionality
  const startCamera = async () => {
    try {
      setIsCapturing(true)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      setUploadError("Could not access camera. Please check permissions or use file upload instead.")
      setIsCapturing(false)
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      const tracks = stream.getTracks()

      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setIsCapturing(false)
  }

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw the video frame to the canvas
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert canvas to blob
      canvas.toBlob(
        async (blob) => {
          if (blob) {
            const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" })
            await handleFileChange(file)
            stopCamera()
          }
        },
        "image/jpeg",
        0.9,
      )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Upload a facial image (optional)</h2>
        <p className="text-gray-600 mb-4">
          This helps our AI analyze your skin condition more accurately. Your image will be processed securely and not
          stored permanently.
        </p>
      </div>

      {uploadError && (
        <Alert variant="destructive">
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {!formData.faceImagePreview ? (
        <>
          {!isCapturing ? (
            <div className="space-y-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  dragActive ? "border-pink-500 bg-pink-50" : "border-gray-300 hover:border-pink-400 hover:bg-gray-50",
                )}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="p-3 bg-pink-100 rounded-full">
                    <Upload className="h-6 w-6 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-base font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">JPG, PNG or JPEG (max. 5MB)</p>
                  </div>
                  <Button variant="outline" size="sm" type="button">
                    Select File
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">- or -</p>
                <Button variant="outline" type="button" onClick={startCamera} className="flex items-center">
                  <Camera className="mr-2 h-4 w-4" />
                  Take a Photo
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex justify-center space-x-4">
                <Button variant="outline" onClick={stopCamera}>
                  Cancel
                </Button>
                <Button onClick={capturePhoto}>Capture</Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card className="overflow-hidden">
          <div className="relative">
            <img
              src={formData.faceImagePreview || "/placeholder.svg"}
              alt="Face preview"
              className="w-full h-auto max-h-[300px] object-contain"
            />
            <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={removeImage}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      <div className="pt-4">
        <p className="text-sm text-gray-500">
          <strong>Privacy note:</strong> Your image will only be used for analysis and will not be stored permanently.
          You can skip this step if you prefer not to upload an image.
        </p>
      </div>
    </div>
  )
}
