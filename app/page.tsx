import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-pink-500" />
            <span className="font-bold text-xl">SkinSage</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-sm font-medium hover:underline">
              Brand Login
            </Link>
            <Button variant="outline" size="sm">
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                  Personalized skincare recommendations powered by AI
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                  Help your customers find the perfect products for their unique skin needs with our AI-powered
                  consultation tool.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/questionnaire">
                    <Button size="lg" className="w-full sm:w-auto">
                      Try Demo <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      Contact Sales
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative h-[400px] rounded-lg overflow-hidden shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-100 to-purple-200 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <Sparkles className="h-12 w-12 text-pink-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">AI-Powered Analysis</h3>
                    <p className="text-gray-600">Upload your photo for personalized skincare recommendations</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-gray-50">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-pink-600 font-bold">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Interactive Questionnaire</h3>
                <p className="text-gray-600">
                  Answer detailed questions about your skin type, concerns, preferred ingredients, and upload an optional photo for AI analysis.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-pink-600 font-bold">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
                <p className="text-gray-600">
                  Our advanced AI analyzes your responses and facial image using computer vision and dermatological expertise to identify skin conditions and needs.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-pink-600 font-bold">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Personalized Recommendations</h3>
                <p className="text-gray-600">
                  Receive personalized product recommendations from our database of 1000+ products, plus a custom skincare routine and professional analysis.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-5xl text-center">
            <h2 className="text-3xl font-bold mb-8">Powered by Advanced AI Technology</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-4">
                <div className="text-3xl font-bold text-pink-600 mb-2">1000+</div>
                <p className="text-gray-600">Curated Products</p>
              </div>
              <div className="p-4">
                <div className="text-3xl font-bold text-pink-600 mb-2">AI</div>
                <p className="text-gray-600">Computer Vision</p>
              </div>
              <div className="p-4">
                <div className="text-3xl font-bold text-pink-600 mb-2">24/7</div>
                <p className="text-gray-600">Available Analysis</p>
              </div>
              <div className="p-4">
                <div className="text-3xl font-bold text-pink-600 mb-2">100%</div>
                <p className="text-gray-600">Personalized</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="h-6 w-6 text-pink-400" />
                <span className="font-bold text-xl">SkinSage</span>
              </div>
              <p className="text-gray-400">AI-powered skincare recommendations for cosmetic brands.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white">
                    Case Studies
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white">
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© 2025 SkinSage. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
