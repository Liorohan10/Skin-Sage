"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, CheckCircle2, Clock, ThumbsUp, Info } from "lucide-react"
import { ResultsLoading } from "./results-loading"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useResultsStore, type ResultsData } from "@/lib/results-store"

interface ResultsContentProps {
  resultId: string
  tab: "recommendations" | "analysis" | "routine"
}

interface EnhancedProduct {
  name: string
  description: string
  price: string
  ingredients: string
  suitableFor: string
  matchReasons?: string[]
}

interface EnhancedResultsData extends ResultsData {
  recommendedProducts: EnhancedProduct[]
}

type RoutineStep = { productName?: string; product?: any; action?: string; instruction?: string } | string

function processRoutineStep(step: RoutineStep) {
  if (!step) return { product: null as any, productName: '', action: '', instruction: '' }
  if (typeof step === 'string') {
    return { product: null as any, productName: '', action: '', instruction: step }
  }
  const rawProduct = (step as any).product
  const productName = (step as any).productName || (typeof rawProduct === 'string' ? rawProduct : (rawProduct?.name || ''))
  return {
    product: typeof rawProduct === 'object' ? rawProduct : null,
    productName,
    action: (step as any).action || (step as any).step || (step as any).title || '',
    instruction: (step as any).instruction || (step as any).notes || (step as any).description || ''
  }
}

export function ResultsContent({ resultId, tab }: ResultsContentProps) {
  const router = useRouter()
  const getResult = useResultsStore((state) => state.getResult)
  const [data, setData] = useState<EnhancedResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const result = getResult(resultId)
    if (result) {
      console.log('[Results] loaded result:', result)
      setData(result as EnhancedResultsData)
    } else {
      setError('Results not found. Please try starting a new consultation.')
    }
    setLoading(false)
  }, [resultId, getResult])

  if (loading) return <ResultsLoading />
  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Error Loading Results</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <div className="flex justify-center space-x-4">
          <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
          <Button onClick={() => router.push('/questionnaire')}>Start New Consultation</Button>
        </div>
      </div>
    )
  }

  if (!data) return (
    <div className="p-8 text-center">
      <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
      <h3 className="text-xl font-bold mb-2">Results Not Found</h3>
      <p className="text-gray-600 mb-4">We couldn't find the recommendations you're looking for.</p>
      <Button onClick={() => router.push('/questionnaire')}>Start New Consultation</Button>
    </div>
  )

  // Analysis helpers
  const formatAnalysis = (text: string) => {
    if (!text) return []
    let s = text.replace(/\*\*/g, '')
    s = s.replace(/\*/g, '')
    s = s.replace(/Dermatolog(ical|y) Consultation Note/gi, '')
    s = s.replace(/DERMATOLOGY CONSULTATION NOTE/gi, '')
    s = s.replace(/Patient ID:\s*\[.*?\]/gi, '')
    s = s.replace(/Date:\s*.*$/gim, '')
    s = s.replace(/RE:\s*.*$/gim, '')
    s = s.replace(/Sincerely,?[\s\S]*$/i, '')
    s = s.replace(/Your Dermatologist/gi, '')
    s = s.replace(/(^|[\.?\!]\s+)(I\s+)/g, '$1')
    s = s.replace(/(^|[\.?\!]\s+)(My\s+)/g, '$1')

    // Prefer paragraph splits; fall back to sentence splits
    let paras = s.split(/\n\s*\n|\r\n\s*\r\n/).map(p => p.trim()).filter(Boolean)
    if (paras.length === 0) {
      const sentences = s.split(/(?<=[\.!?])\s+(?=[A-Z])/).map(t => t.trim()).filter(Boolean)
      paras = [sentences.join(' ')]
    }
    // De-duplicate and normalize whitespace
    const normalized = Array.from(new Set(paras.map(p => p.replace(/\s{2,}/g, ' ').trim())))
    // Cap to a reasonable number to avoid overly long pages, but don’t truncate individual paragraphs
    return normalized.slice(0, 12)
  }

  const extractAnalysis = (d: any) => {
    let text: string | null = null
    let structured: any = null
    const candidates = [d?.analysis, d?.skin_analysis, d?.consultation, d?.analysis?.consultation, d?.skin_analysis?.consultation, d]

    for (const c of candidates) {
      if (!c) continue
      if (typeof c === 'string') {
        const t = c.trim()
        if ((t.startsWith('{') || t.startsWith('['))) {
          try {
            const parsed = JSON.parse(t)
            if (parsed.full_analysis) text = parsed.full_analysis
            else if (parsed.consultation) text = parsed.consultation
            else if (parsed.analysis) text = typeof parsed.analysis === 'string' ? parsed.analysis : JSON.stringify(parsed.analysis)
            if (parsed.structured_insights) structured = parsed.structured_insights
          } catch (e) {
            if (!text) text = c
          }
        } else {
          if (!text) text = c
        }
      } else if (typeof c === 'object') {
        // Direct fields
        if (!text && typeof c.full_analysis === 'string') text = c.full_analysis
        if (!text && typeof c.consultation === 'string') text = c.consultation
        if (!text && typeof c.text === 'string') text = c.text
        if (!structured && c.structured_insights) structured = c.structured_insights

        // Nested common shapes (consultation as object, gemini_vision)
        const nestedConsult = (c as any).consultation
        if (!text && nestedConsult && typeof nestedConsult === 'object') {
          if (typeof nestedConsult.full_analysis === 'string') text = nestedConsult.full_analysis
          else if (typeof nestedConsult.consultation === 'string') text = nestedConsult.consultation
          if (!structured && nestedConsult.structured_insights) structured = nestedConsult.structured_insights
        }

        const gv = (c as any).gemini_vision
        if (!text && gv && typeof gv === 'object') {
          if (typeof gv.full_analysis === 'string') text = gv.full_analysis
          else if (typeof gv.consultation === 'string') text = gv.consultation
          if (!structured && gv.structured_insights) structured = gv.structured_insights
        }

        // Last resort: scan for any long-ish string values
        if (!text) {
          for (const k of Object.keys(c)) {
            if (typeof (c as any)[k] === 'string') {
              text = (c as any)[k]
              break
            }
          }
        }
      }
      if (text || structured) break
    }

    return { text: text || '', structured }
  }

  const { text: rawText, structured } = extractAnalysis(data)
  const dAny: any = data as any
  const vision = dAny?.analysis?.gemini_vision || dAny?.gemini_vision || dAny?.analysis?.vision || null
  const paragraphs = rawText && rawText.trim().length > 0
    ? formatAnalysis(rawText)
    : (function(s:any){
        if (!s) return []
        const parts: string[] = []
        const summaryParts: string[] = []
        if (s.skinType) summaryParts.push(`Skin type: ${s.skinType}`)
        if (s.overall_assessment) summaryParts.push(s.overall_assessment)
        if (s.priority_areas) summaryParts.push(`Priority: ${s.priority_areas}`)
        if (summaryParts.length > 0) parts.push(summaryParts.join('. '))
        const signs: string[] = []
        if (s.texture) signs.push(`Texture: ${s.texture.replace(/_/g, ' ')}`)
        if (s.pores) signs.push(`Pores: ${s.pores.replace(/_/g, ' ')}`)
        if (s.oil_distribution) signs.push(`Oil: ${s.oil_distribution.replace(/_/g, ' ')}`)
        if (s.pigmentation) signs.push(`Pigmentation: ${s.pigmentation.replace(/_/g, ' ')}`)
        if (signs.length > 0) parts.push(signs.join('; ') + '.')
        return parts
      })(structured)

  const finalParagraphs = (paragraphs && paragraphs.length > 0) ? paragraphs : formatAnalysis(rawText)

  // Routine helpers
  const getRoutineSteps = (routineData: any) => {
    if (!routineData) return []
    if (Array.isArray(routineData)) return routineData
    if (typeof routineData === 'string') return routineData.split('\n').filter((l:any) => l.trim() !== '')
    if (typeof routineData === 'object' && routineData !== null) {
      if (Array.isArray(routineData.morning) || Array.isArray(routineData.evening)) return routineData
    }
    console.warn('Unknown routine data format:', routineData)
    return []
  }

  const morningSteps: (string | RoutineStep)[] = (data.routine?.morning && Array.isArray(data.routine.morning)) ? data.routine.morning : (Array.isArray(data.morningRoutine) ? data.morningRoutine : (typeof data.morningRoutine === 'string' ? data.morningRoutine.split('\n').filter(Boolean) : []))
  const eveningSteps: (string | RoutineStep)[] = (data.routine?.evening && Array.isArray(data.routine.evening)) ? data.routine.evening : (Array.isArray(data.nightRoutine) ? data.nightRoutine : (typeof data.nightRoutine === 'string' ? data.nightRoutine.split('\n').filter(Boolean) : []))
  const weeklySteps: (string | RoutineStep)[] = (data.routine?.weekly && Array.isArray(data.routine.weekly)) ? data.routine.weekly : []

  if (tab === 'recommendations') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-4">Recommended Products</h2>
        <p className="text-gray-600 mb-6">Based on your skin profile, we recommend the following products that are suitable for your skin type, preferences, and budget.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data.recommendedProducts || []).map((product, index) => (
            <Card key={index} className="p-4 h-full flex flex-col">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">{product.name}</h3>
                <p className="text-pink-600 font-medium mb-3">{product.price}</p>
                <p className="text-gray-700 mb-3">{product.description}</p>
                <div className="mt-auto">
                  <div className="text-sm text-gray-600 mb-2"><span className="font-medium">Suitable for:</span> {product.suitableFor}</div>
                  <div className="text-sm text-gray-600"><span className="font-medium">Key ingredients:</span> {product.ingredients}</div>

                  {product.matchReasons && product.matchReasons.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <h4 className="text-sm font-medium mb-2 flex items-center"><ThumbsUp className="h-4 w-4 mr-1 text-green-600" />Why this matches your profile:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">{(product.matchReasons || []).map((r, i) => (<li key={i} className="flex items-start"><span className="text-green-600 mr-1.5">•</span>{r}</li>))}</ul>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">Recommended</Badge>
                <button className="text-pink-600 text-sm font-medium hover:underline">View Details</button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (tab === 'analysis') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-4">Skin Condition Analysis</h2>
        <Card className="p-6">
          {/* Build concise lists from structured insights and context */}
          {(() => {
            const s: any = structured || {}
            const profile = (data.userProfile || {}) as { skinType?: string; concerns?: string[]; ageRange?: string }
            const dAny: any = data as any
            const acneCount = Array.isArray(dAny?.analysis?.acne_detections) ? dAny.analysis.acne_detections.length : 0

            const issues: string[] = []
            if (acneCount > 0) issues.push(`Active acne (${acneCount})`)
            if (s.pores === 'congested' || s.pores === 'enlarged') issues.push('Congested/enlarged pores')
            if (s.oil_distribution === 'oily_areas_detected') issues.push('Oily areas / excess sebum')
            if (s.pigmentation === 'uneven_pigmentation') issues.push('Uneven pigmentation / dark spots')
            if (s.texture === 'rough_uneven') issues.push('Uneven texture')
            // Include reported concerns succinctly if not already represented
            for (const c of (profile.concerns || [])) {
              const short = String(c)
              if (!issues.some(i => i.toLowerCase().includes(short.toLowerCase()))) issues.push(short)
            }

            const positives: string[] = []
            if (s.texture === 'smooth') positives.push('Smooth texture')
            if (s.pores === 'normal') positives.push('Refined pores')
            if (s.oil_distribution === 'balanced') positives.push('Balanced oil levels')
            if (s.pigmentation === 'even_toned') positives.push('Even skin tone')
            if (s.overall_health === 'good_condition') positives.push('Overall healthy skin')

            const causes: string[] = []
            if (s.oil_distribution === 'oily_areas_detected') causes.push('Over-cleansing/stripping or excess sebum')
            if (s.pores === 'congested') causes.push('Comedogenic products or incomplete cleansing')
            if (acneCount > 0) causes.push('Hormonal shifts, bacteria, or pore clogging')
            if (s.pigmentation === 'uneven_pigmentation') causes.push('Sun exposure or post‑inflammation')
            if ((profile.skinType || '').toLowerCase() === 'sensitive') causes.push('Compromised barrier or irritant exposure')

            return (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Detected Skin Issues</h3>
                  <ul className="list-disc pl-5 text-gray-700 space-y-1">
                    {(issues.length ? issues : ['No significant issues detected']).slice(0,6).map((i, idx) => (<li key={idx}>{i}</li>))}
                  </ul>
                </div>

                {positives.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Good Qualities</h3>
                    <ul className="list-disc pl-5 text-gray-700 space-y-1">
                      {positives.slice(0,6).map((p, idx) => (<li key={idx}>{p}</li>))}
                    </ul>
                  </div>
                )}

                {causes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Likely Causes</h3>
                    <ul className="list-disc pl-5 text-gray-700 space-y-1">
                      {causes.slice(0,6).map((c, idx) => (<li key={idx}>{c}</li>))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })()}
        </Card>
      </div>
    )
  }

  if (tab === 'routine') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-4">Recommended Skincare Routine</h2>
        <p className="text-gray-600 mb-6">Follow this personalized routine consistently for best results. Adjust as needed based on how your skin responds.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4"><div className="bg-amber-100 p-2 rounded-full"><Clock className="h-5 w-5 text-amber-600" /></div><h3 className="text-xl font-semibold">Morning Routine</h3></div>
            <ol className="space-y-4 mt-4">
              {(Array.isArray(morningSteps) ? morningSteps : []).map((step, index) => {
                const { product, productName, action, instruction } = processRoutineStep(step as RoutineStep)
                const displayInstruction = instruction || (typeof step === 'string' ? step : JSON.stringify(step).slice(0,200))
                return (
                  <li key={index} className="flex items-start">
                    <span className="bg-pink-100 text-pink-800 w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0">{index+1}</span>
                    <div className="flex-1">
                      {action ? (<><span className="font-semibold block">{action}</span><span className="block text-gray-700 mb-1">{displayInstruction}</span></>) : (<span className="block mb-1">{displayInstruction}</span>)}
                      {(product || productName) && (
                        <div className="mt-1 text-sm bg-blue-50 p-2 rounded border border-blue-100">
                          <span className="font-medium">Product:</span>{' '}
                          {product ? (<>
                            {product.name}
                            {product.price ? <span className="text-gray-600"> • {product.price}</span> : null}
                          </>) : productName}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4"><div className="bg-indigo-100 p-2 rounded-full"><Clock className="h-5 w-5 text-indigo-600" /></div><h3 className="text-xl font-semibold">Evening Routine</h3></div>
            <ol className="space-y-4 mt-4">
              {(Array.isArray(eveningSteps) ? eveningSteps : []).map((step, index) => {
                const { product, productName, action, instruction } = processRoutineStep(step as RoutineStep)
                const displayInstruction = instruction || (typeof step === 'string' ? step : JSON.stringify(step).slice(0,200))
                return (
                  <li key={index} className="flex items-start">
                    <span className="bg-pink-100 text-pink-800 w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0">{index+1}</span>
                    <div className="flex-1">
                      {action ? (<><span className="font-semibold block">{action}</span><span className="block text-gray-700 mb-1">{displayInstruction}</span></>) : (<span className="block mb-1">{displayInstruction}</span>)}
                      {(product || productName) && (
                        <div className="mt-1 text-sm bg-blue-50 p-2 rounded border border-blue-100">
                          <span className="font-medium">Product:</span>{' '}
                          {product ? (<>
                            {product.name}
                            {product.price ? <span className="text-gray-600"> • {product.price}</span> : null}
                          </>) : productName}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </Card>
        </div>

        {weeklySteps.length > 0 ? (
          <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold mb-2">Weekly Treatments</h3>
            <p className="text-gray-700 mb-4">In addition to your daily routine, consider these weekly treatments:</p>
            <ul className="space-y-3">
              {(Array.isArray(weeklySteps) ? weeklySteps : []).map((step, index) => {
                const { product, productName, action, instruction } = processRoutineStep(step as RoutineStep)
                const displayInstruction = instruction || (typeof step === 'string' ? step : JSON.stringify(step).slice(0,200))
                return (
                  <li key={index} className="flex items-start space-x-2"><CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" /><div className="flex-1">{action ? (<><span className="font-semibold block">{action}</span><span className="block text-gray-700 mb-1">{displayInstruction}</span></>) : (<span className="block mb-1">{displayInstruction}</span>)}{(product || productName) && (<div className="mt-1 text-sm bg-blue-50 p-2 rounded border border-blue-100"><span className="font-medium">Product:</span> {product ? (<>{product.name}{product.price ? <span className="text-gray-600"> • {product.price}</span> : null}</>) : productName}</div>)}</div></li>
                )
              })}
            </ul>
          </Card>
        ) : (
          <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold mb-2">Weekly Treatments</h3>
            <p className="text-gray-700 mb-4">In addition to your daily routine, consider these weekly treatments:</p>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2"><CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" /><span>Gentle exfoliation 1-2 times per week to remove dead skin cells</span></li>
              <li className="flex items-start space-x-2"><CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" /><span>Hydrating mask once per week, focusing on dry areas</span></li>
              <li className="flex items-start space-x-2"><CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" /><span>Clay mask on oily areas once per week to control excess sebum</span></li>
            </ul>
          </Card>
        )}
      </div>
    )
  }

  return null
}
