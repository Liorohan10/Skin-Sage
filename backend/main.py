# FastAPI backend for AI-powered endpoints
from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel, Field
from typing import List, Tuple, Optional

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
import cv2
from acne_detector import AcneDetector
from recommendation import ProductRecommender
import io
import random

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
recommender = ProductRecommender()

# Pydantic model for the recommendation request body
class RecommendationRequest(BaseModel):
    ageRange: str = Field(..., alias="age_group")
    skinConcerns: List[str] = Field(..., alias="skin_concerns")
    skinType: str = Field(..., alias="skin_type")
    budget: Tuple[int, int] = Field(..., alias="price_range")
    ingredients: List[str] = Field(default_factory=list)
    avoidIngredients: List[str] = Field(default_factory=list, alias="avoid_ingredients")

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

def generate_personalized_routine(recommendations: List[dict]) -> dict:
    """Generates a personalized skincare routine from recommended products."""
    if not recommendations:
        return {
            "morning": ["No products found to generate a routine."],
            "evening": ["Please adjust your criteria and try again."],
        }

    # Simple logic to assign products to morning/evening
    morning_routine = []
    evening_routine = []

    # Look for specific product types using the formatted field names
    cleanser = next((p['name'] for p in recommendations if 'cleanser' in p['name'].lower()), "Generic Cleanser")
    moisturizer = next((p['name'] for p in recommendations if 'moisturizer' in p['name'].lower() or 'cream' in p['name'].lower()), "Generic Moisturizer")
    sunscreen = next((p['name'] for p in recommendations if 'sunscreen' in p['name'].lower() or 'spf' in p['name'].lower()), "Generic Sunscreen")
    serum = next((p['name'] for p in recommendations if 'serum' in p['name'].lower()), None)

    # Build routines
    morning_routine.append(f"1. Cleanse with: {cleanser}")
    if serum:
        morning_routine.append(f"2. Apply Serum: {serum}")
    morning_routine.append(f"3. Moisturize with: {moisturizer}")
    morning_routine.append(f"4. Protect with Sunscreen: {sunscreen}")

    evening_routine.append(f"1. Cleanse with: {cleanser}")
    # Add a random recommended product if it's not already in the routine
    extra_product = random.choice(recommendations)
    if extra_product['name'] not in [cleanser, moisturizer, sunscreen, serum]:
        evening_routine.append(f"2. Treat with: {extra_product['name']}")
    evening_routine.append(f"3. Moisturize with: {moisturizer}")
    
    return {"morning": morning_routine, "evening": evening_routine}

@app.post("/api/recommend-products")
async def recommend_products(request: RecommendationRequest):
    preferences = request.dict(by_alias=True)
    
    # The Pydantic model now directly provides the structure needed by the recommender
    recommendations = recommender.recommend(preferences)
    
    # Generate the personalized routine based on the recommendations
    routine = generate_personalized_routine(recommendations)
    
    return {"recommendations": recommendations, "routine": routine}
