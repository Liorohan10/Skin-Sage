# FastAPI backend for AI-powered endpoints
from fastapi import FastAPI, File, UploadFile, Form
from pydantic import BaseModel, Field
from typing import List, Tuple, Optional
import os
from dotenv import load_dotenv

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
import cv2
from acne_detector import AcneDetector
import random

# Load environment variables
load_dotenv()

app = FastAPI()

# Allow CORS for local dev and frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

acne_detector = AcneDetector()

"""
RAG functionality removed: simplifying the backend to a straightforward
recommendation + Gemini-driven routine and analysis workflow.
"""

# Try to use Supabase if credentials are available, otherwise fall back to CSV
try:
    from recommendation_supabase import ProductRecommenderSupabase
    if os.getenv('SUPABASE_URL') and os.getenv('SUPABASE_ANON_KEY'):
        recommender = ProductRecommenderSupabase()
        print("✅ Using Supabase for product recommendations")
    else:
        raise ImportError("Supabase credentials not found")
except (ImportError, Exception) as e:
    print(f"⚠️ Supabase not available ({str(e)}), falling back to CSV-based recommendations")
    try:
        from recommendation_minimal import ProductRecommender
        recommender = ProductRecommender()
        print("✅ Using minimal CSV-based recommendations for debugging")
    except Exception as e2:
        print(f"❌ Error loading minimal recommender: {e2}")
        from recommendation import ProductRecommender
        recommender = ProductRecommender()
        print("✅ Using original CSV-based recommendations")

# Initialize Gemini service (for direct image analysis endpoint)
try:
    from gemini_service import GeminiAIService
    gemini_ai = GeminiAIService()
    print("✅ Gemini service initialized for analysis endpoint")
except Exception as e:
    print(f"⚠️ Gemini service not available: {e}")
    gemini_ai = None

# Pydantic model for the recommendation request body
class RecommendationRequest(BaseModel):
    ageRange: str = Field(..., alias="age_group")
    skinConcerns: List[str] = Field(..., alias="skin_concerns")
    skinType: str = Field(..., alias="skin_type")
    budget: Tuple[int, int] = Field(..., alias="price_range")
    budgetTier: Optional[str] = Field(default=None, alias="budget_tier")
    ingredients: List[str] = Field(default_factory=list)
    avoidIngredients: List[str] = Field(default_factory=list, alias="avoid_ingredients")
    useAiEnhancement: bool = Field(default=True, alias="use_ai_enhancement")  # New field for AI toggle
    # Optional field for including acne detection results
    acneDetections: Optional[List] = Field(default=None, alias="acne_detections")

@app.post("/api/detect-skin-issues")
async def detect_skin_issues(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Handle cases where image decoding might fail
    if image is None:
        return JSONResponse(status_code=400, content={"message": "Invalid image file"})

    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    detections = acne_detector.detect(image_rgb)
    return {"detections": detections}

@app.post("/api/recommend-products")
async def recommend_products(request: RecommendationRequest):
    preferences = request.dict(by_alias=True)
    
    # Extract acne detection results and AI enhancement flag
    acne_detections = preferences.pop('acne_detections', None)
    use_ai_enhancement = preferences.pop('use_ai_enhancement', True)
    
    # Get hybrid recommendations with logic + AI
    recommendations = recommender.recommend(
        preferences, 
        num_recommendations=15,  # Get more recommendations for better variety
        use_ai_enhancement=use_ai_enhancement
    )
    
    # Generate the personalized routine using the recommender's method (with Gemini AI)
    acne_detected = bool(acne_detections and len(acne_detections) > 0)
    routine = recommender.generate_skincare_routine(preferences, acne_detected)
    
    # Generate AI-powered skin analysis with acne detection results
    user_profile = {
        'skinType': preferences.get('skin_type', 'Unknown'),
        'ageRange': preferences.get('age_group', 'Unknown'),
        'concerns': preferences.get('skin_concerns', []),
        'preferredIngredients': preferences.get('ingredients', []),
        'avoidIngredients': preferences.get('avoid_ingredients', []),
        'budget': preferences.get('price_range', 'Unknown')
    }
    
    # Pass acne detections to skin analysis
    skin_analysis = recommender.generate_skin_analysis(user_profile, acne_detections)
    
    return {
        "recommendations": recommendations, 
        "routine": routine,
        "skin_analysis": skin_analysis
    }

@app.post("/api/generate-routine")
async def generate_routine(request: RecommendationRequest):
    """Generate a skincare routine based on user preferences"""
    preferences = request.dict(by_alias=True)
    
    # Extract acne detection results if provided
    acne_detections = preferences.pop('acne_detections', None)
    acne_detected = bool(acne_detections and len(acne_detections) > 0)
    
    # Generate the personalized routine using the recommender's method
    routine = recommender.generate_skincare_routine(preferences, acne_detected)
    
    return {
        "routine": routine,
        "status": "success"
    }

@app.post("/api/analyze-skin")
async def analyze_skin(
    file: UploadFile = File(...),
    skin_type: str = Form(...),
    age_group: str = Form(...),
    skin_concerns: str = Form("[]"),  # JSON array string
    ingredients: str = Form("[]"),    # JSON array string
    avoid_ingredients: str = Form("[]"),  # JSON array string
    price_range: str = Form("[]")  # JSON array string like [min, max]
):
    """Analyze a face image with Gemini and user context.

    Accepts multipart/form-data with an image file and user fields.
    Returns Gemini's detailed analysis, structured insights, and acne detections.
    """
    if gemini_ai is None:
        return JSONResponse(status_code=503, content={"message": "Gemini service not available"})

    # Read the uploaded image
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        return JSONResponse(status_code=400, content={"message": "Invalid image file"})

    # Acne detections via YOLO (optional context)
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    detections = acne_detector.detect(image_rgb)

    # Parse JSON-like fields
    import json as _json
    try:
        concerns = _json.loads(skin_concerns) if skin_concerns else []
    except Exception:
        concerns = []
    try:
        pref_ingredients = _json.loads(ingredients) if ingredients else []
    except Exception:
        pref_ingredients = []
    try:
        avoid_ing = _json.loads(avoid_ingredients) if avoid_ingredients else []
    except Exception:
        avoid_ing = []
    try:
        budget = _json.loads(price_range) if price_range else []
    except Exception:
        budget = []

    user_profile = {
        'skinType': skin_type,
        'ageRange': age_group,
        'concerns': concerns,
        'preferredIngredients': pref_ingredients,
        'avoidIngredients': avoid_ing,
        'budget': budget
    }

    # Run Gemini vision analysis
    analysis = gemini_ai.analyze_skin_image(contents, user_profile)

    # Also generate text consultation that references detections
    consultation_text = gemini_ai.generate_skin_analysis(user_profile, acne_detections=detections)

    return {
        "acne_detections": detections,
        "gemini_vision": analysis,
        "consultation": consultation_text
    }

@app.get("/api/test-ai-routine")
async def test_ai_routine():
    """Test endpoint to debug AI routine generation."""
    try:
        test_preferences = {
            'skin_type': 'oily',
            'age_group': '25-34',
            'skin_concerns': ['Acne', 'Oiliness'],
            'price_range': [100, 1000],
            'ingredients': ['Salicylic Acid'],
            'avoid_ingredients': ['Fragrance']
        }
        
        test_products = [
            {
                'name': 'CeraVe Foaming Facial Cleanser',
                'description': 'Gentle foaming cleanser for oily skin',
                'ingredients': 'Ceramides, Hyaluronic Acid',
                'suitableFor': 'Oily skin',
                'price': '₹299'
            },
            {
                'name': 'The Ordinary Niacinamide 10% + Zinc 1%',
                'description': 'Serum to reduce oiliness and blemishes',
                'ingredients': 'Niacinamide, Zinc',
                'suitableFor': 'Oily and acne-prone skin',
                'price': '₹590'
            }
        ]
        
        if hasattr(recommender, 'gemini_ai') and recommender.gemini_ai:
            user_profile = {
                'skinType': 'Oily',
                'ageRange': '25-34',
                'concerns': ['Acne', 'Oiliness'],
                'preferredIngredients': ['Salicylic Acid'],
                'avoidIngredients': ['Fragrance'],
                'budget': [100, 1000]
            }
            
            routine = recommender.gemini_ai.generate_skincare_routine(user_profile, test_products, False)
            return {"status": "success", "routine": routine}
        else:
            return {"status": "error", "message": "Gemini AI not available"}
            
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/test-ai-recommendations")
async def test_ai_recommendations(request: RecommendationRequest):
    """Test endpoint to specifically try AI-enhanced recommendations"""
    preferences = request.dict(by_alias=True)
    
    # Force AI enhancement on
    preferences.pop('use_ai_enhancement', None)
    acne_detections = preferences.pop('acne_detections', None)
    
    try:
        # Get both logic and AI recommendations separately for comparison
        logic_recommendations = recommender._get_logic_based_recommendations(preferences, 10)
        
        if recommender.gemini_ai:
            # Prepare for AI recommendations
            product_database = recommender.df.to_dict('records')
            user_profile = {
                'skinType': preferences.get('skin_type', 'Unknown'),
                'ageRange': preferences.get('age_group', 'Unknown'),
                'concerns': preferences.get('skin_concerns', []),
                'preferredIngredients': preferences.get('ingredients', []),
                'avoidIngredients': preferences.get('avoid_ingredients', []),
                'budget': preferences.get('price_range', 'Unknown')
            }
            
            ai_recommendations = recommender.gemini_ai.generate_ai_product_recommendations(
                user_profile, 
                product_database, 
                logic_recommendations
            )
            
            # Get final hybrid recommendations
            hybrid_recommendations = recommender._combine_recommendations(
                logic_recommendations, 
                ai_recommendations, 
                15
            )
            
            return {
                "logic_recommendations": logic_recommendations[:5],
                "ai_recommendations": ai_recommendations[:5],
                "hybrid_recommendations": hybrid_recommendations[:10],
                "status": "success",
                "ai_available": True
            }
        else:
            return {
                "logic_recommendations": logic_recommendations[:10],
                "ai_recommendations": [],
                "hybrid_recommendations": logic_recommendations[:10],
                "status": "success",
                "ai_available": False,
                "message": "AI enhancement not available"
            }
    except Exception as e:
        return {"error": str(e), "status": "error"}

@app.get("/api/health")
async def enhanced_health_check():
    """Simplified health check without RAG."""
    return {
        "services": {
            "acne_detector": "operational",
            "recommender": "operational",
            "gemini": "operational" if gemini_ai is not None else "unavailable"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
