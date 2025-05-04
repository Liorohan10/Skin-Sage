import { QuestionnaireForm } from "@/components/questionnaire-form"

export default function QuestionnairePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">Skincare Consultation</h1>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <QuestionnaireForm />
          </div>
        </div>
      </div>
    </div>
  )
}
