import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// Backend configuration
const PY_BACKEND = process.env.NEXT_PUBLIC_PY_BACKEND_URL || "http://127.0.0.1:8000"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    // Log whether an image file was included (helpful for debugging uploads)
    try {
      const hasFile = formData.has('file')
      if (hasFile) {
        const file = formData.get('file') as any
        console.log('[Proxy][analyze-skin] forwarding image file:', file?.name || '<unknown>', 'size:', file?.size || '<unknown>')
      } else {
        console.log('[Proxy][analyze-skin] no image file found in formData')
      }
    } catch (e) {
      console.warn('[Proxy][analyze-skin] error checking formData file presence:', e)
    }

    // Forward as multipart/form-data
    const res = await fetch(`${PY_BACKEND}/api/analyze-skin`, {
      method: "POST",
      body: formData as any,
    })

    const data = await res.json()

    // Log Gemini vision/consultation snippets to Next.js dev terminal
    const consult = String(data?.consultation || "").slice(0, 1200)
    const vision = JSON.stringify(data?.gemini_vision)?.slice(0, 1200)
    console.log("[Gemini][analyze-skin] consultation (first 1.2k chars):", consult)
    console.log("[Gemini][analyze-skin] vision payload preview:", vision)

    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error("[Proxy][analyze-skin] error:", err)
    return NextResponse.json({ error: "Proxy failed", detail: String(err) }, { status: 500 })
  }
}
