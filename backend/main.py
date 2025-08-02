# FastAPI backend for AI-powered endpoints
from fastapi import FastAPI, File, UploadFile
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
    from recommendation import ProductRecommender
    recommender = ProductRecommender()

# Pydantic model for the recommendation request body
class RecommendationRequest(BaseModel):
    ageRange: str = Field(..., alias="age_group")
    skinConcerns: List[str] = Field(..., alias="skin_concerns")
    skinType: str = Field(..., alias="skin_type")
    budget: Tuple[int, int] = Field(..., alias="price_range")
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
    
    try:
        # Validate input data
        required_fields = ['skin_type', 'age_group', 'price_range']
        for field in required_fields:
            if field not in preferences:
                return JSONResponse(
                    status_code=400, 
                    content={"error": f"Missing required field: {field}"}
                )
        
        # Validate price_range format
        price_range = preferences.get('price_range')
        if not isinstance(price_range, (list, tuple)) or len(price_range) != 2:
            return JSONResponse(
                status_code=400,
                content={"error": "price_range must be a list/tuple of two numbers"}
            )
    
    except Exception as validation_error:
        return JSONResponse(
            status_code=400,
            content={"error": f"Validation error: {str(validation_error)}"}
        )
    
    # Get hybrid recommendations with logic + AI
    try:
        recommendations = recommender.recommend(
            preferences, 
            num_recommendations=15,  # Get more recommendations for better variety
            use_ai_enhancement=use_ai_enhancement
        )
        
        if not recommendations:
            print("No recommendations found, trying with relaxed parameters...")
            # Try with more relaxed parameters
            relaxed_preferences = preferences.copy()
            relaxed_preferences['price_range'] = [0, 5000]  # Expand price range
            relaxed_preferences['avoid_ingredients'] = []   # Remove avoid ingredients
            
            recommendations = recommender.recommend(
                relaxed_preferences,
                num_recommendations=10,
                use_ai_enhancement=False  # Disable AI for fallback
            )
    
    except Exception as rec_error:
        print(f"Recommendation error: {rec_error}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to generate recommendations: {str(rec_error)}"}
        )
    
    # Generate the personalized routine using the recommender's method (with Gemini AI)
    try:
        acne_detected = bool(acne_detections and len(acne_detections) > 0)
        routine = recommender.generate_skincare_routine(preferences, acne_detected)
    except Exception as routine_error:
        print(f"Routine generation error: {routine_error}")
        # Generate basic fallback routine
        routine = {
            'morning': [
                {'step': 'Cleanse', 'instruction': 'Gently cleanse your face with a suitable cleanser'},
                {'step': 'Treat', 'instruction': 'Apply targeted treatments for your skin concerns'},
                {'step': 'Moisturize', 'instruction': 'Apply moisturizer to hydrate your skin'},
                {'step': 'Protect', 'instruction': 'Apply broad-spectrum sunscreen SPF 30+'}
            ],
            'evening': [
                {'step': 'Cleanse', 'instruction': 'Remove makeup and impurities with a gentle cleanser'},
                {'step': 'Treat', 'instruction': 'Apply evening treatments and serums'},
                {'step': 'Moisturize', 'instruction': 'Apply a nourishing night moisturizer'}
            ],
            'weekly': []
        }
    
    # Generate AI-powered skin analysis with acne detection results
    try:
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
    except Exception as analysis_error:
        print(f"Skin analysis error: {analysis_error}")
        skin_analysis = f"Based on your {preferences.get('skin_type', 'Unknown')} skin type, we recommend following a consistent skincare routine tailored to your needs."
    
    return {
        "recommendations": recommendations, 
        "routine": routine,
        "skin_analysis": skin_analysis,
        "status": "success",
        "metadata": {
            "total_recommendations": len(recommendations),
            "has_routine": bool(routine),
            "has_skin_analysis": bool(skin_analysis),
            "acne_detected": bool(acne_detections and len(acne_detections) > 0)
        }
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
        return JSONResponse(
            status_code=500, 
            content={
                "status": "error", 
                "message": f"Error testing AI recommendations: {str(e)}"
            }
        )
