# Minimal Product Recommendation Logic for debugging
import pandas as pd
import numpy as np
import os

class ProductRecommender:
    def __init__(self, csv_path=None):
        # Don't load data immediately to avoid hanging
        self.csv_path = csv_path or os.path.abspath(os.path.join(os.path.dirname(__file__), '../Product Recommendation Model/amazon_beauty_products_high_quality_20250602_152900.csv'))
        self.df = None
        self.tfidf = None
        self.tfidf_matrix = None
        self.cosine_sim = None
        print("ProductRecommender initialized (lazy loading)")

    def _ensure_data_loaded(self):
        """Load data only when needed"""
        if self.df is None:
            print("Loading CSV data...")
            try:
                self.df = pd.read_csv(self.csv_path)
                print(f"Loaded {len(self.df)} products from CSV")
                # Basic processing
                self.df = self.df.drop_duplicates(subset=['ASIN']).copy() if 'ASIN' in self.df.columns else self.df
                self.df['Price'] = pd.to_numeric(self.df['Price'], errors='coerce') if 'Price' in self.df.columns else 0
                print("Data processing complete")
            except Exception as e:
                print(f"Error loading CSV: {e}")
                # Create minimal fake data
                self.df = pd.DataFrame({
                    'Product Name': ['Sample Product 1', 'Sample Product 2'],
                    'Brand': ['Sample Brand', 'Sample Brand'],
                    'Price': [500, 800],
                    'Rating': [4.0, 4.5],
                    'Active Ingredients': ['Niacinamide', 'Vitamin C'],
                    'Skin_Type': ['All', 'Oily'],
                    'Product Benefits': ['Anti-aging', 'Brightening']
                })
                print("Using sample data due to CSV loading error")

    def recommend(self, preferences, num_recommendations=10, use_ai_enhancement=True):
        """Generate product recommendations"""
        self._ensure_data_loaded()
        
        print(f"Generating {num_recommendations} recommendations...")
        
        # For now, return mock data to test the flow
        mock_recommendations = []
        for i in range(min(num_recommendations, 5)):  # Return up to 5 mock products
            mock_recommendations.append({
                'name': f'Sample Product {i+1}',
                'description': f'This is a sample product {i+1} for testing purposes.',
                'price': f'₹{500 + i*100}',
                'ingredients': 'Niacinamide, Hyaluronic Acid',
                'suitableFor': preferences.get('skin_type', 'All skin types'),
                'brand': 'Sample Brand',
                'rating': '4.5',
                'matchReasons': [
                    f"Suitable for {preferences.get('skin_type', 'all skin types')}",
                    "Contains beneficial ingredients",
                    "Highly rated by customers"
                ]
            })
        
        print(f"Generated {len(mock_recommendations)} mock recommendations")
        return mock_recommendations

    def generate_skincare_routine(self, preferences, acne_detected=False, image_insights=None):
        """Generate a basic skincare routine"""
        print("Generating skincare routine...")
        
        # Initialize Gemini service if available
        if not hasattr(self, 'gemini_ai'):
            try:
                from gemini_service import GeminiAIService
                self.gemini_ai = GeminiAIService()
                print("Gemini AI service initialized")
            except Exception as e:
                print(f"Gemini AI not available: {e}")
                self.gemini_ai = None
        
        # Try AI routine if available
        if self.gemini_ai:
            user_profile = {
                'skinType': preferences.get('skin_type', 'Unknown'),
                'ageRange': preferences.get('age_group', 'Unknown'),
                'concerns': preferences.get('skin_concerns', []),
                'preferredIngredients': preferences.get('ingredients', []),
                'avoidIngredients': preferences.get('avoid_ingredients', []),
                'budget': preferences.get('price_range', 'Unknown')
            }
            
            try:
                ai_routine = self.gemini_ai.generate_skincare_routine(
                    user_profile, 
                    [],  # Empty products list for now
                    acne_detected,
                    image_insights
                )
                
                if ai_routine:
                    print("Generated AI routine successfully")
                    return ai_routine
            except Exception as e:
                print(f"Error generating AI routine: {e}")
        
        # Fallback routine
        print("Using fallback routine")
        morning_routine = [
            {"step": 1, "action": "Cleanse", "instructions": "Use a gentle cleanser suitable for your skin type"},
            {"step": 2, "action": "Tone", "instructions": "Apply toner to balance skin pH"},
            {"step": 3, "action": "Moisturize", "instructions": "Apply moisturizer to hydrate skin"},
            {"step": 4, "action": "Protect", "instructions": "Apply SPF 30+ sunscreen"}
        ]
        
        evening_routine = [
            {"step": 1, "action": "Cleanse", "instructions": "Remove makeup and cleanse thoroughly"},
            {"step": 2, "action": "Treat", "instructions": "Apply treatment products (serums, etc.)"},
            {"step": 3, "action": "Moisturize", "instructions": "Apply night moisturizer"}
        ]
        
        return {
            "morning": morning_routine,
            "evening": evening_routine,
            "weekly": []
        }

    def generate_skin_analysis(self, user_profile, acne_detections=None, image_insights=None):
        """Generate skin analysis"""
        print("Generating skin analysis...")
        
        # Initialize Gemini service if available
        if not hasattr(self, 'gemini_ai'):
            try:
                from gemini_service import GeminiAIService
                self.gemini_ai = GeminiAIService()
                print("Gemini AI service initialized for analysis")
            except Exception as e:
                print(f"Gemini AI not available for analysis: {e}")
                self.gemini_ai = None
        
        # Try AI analysis if available
        if self.gemini_ai:
            try:
                analysis_result = self.gemini_ai.generate_skin_analysis(
                    user_profile, 
                    acne_detections=acne_detections,
                    image_insights=image_insights
                )
                
                if analysis_result:
                    print("Generated AI analysis successfully")
                    return analysis_result
            except Exception as e:
                print(f"Error generating AI analysis: {e}")
        
        # Fallback analysis
        print("Using fallback analysis")
        skin_type = user_profile.get('skinType', 'Unknown')
        concerns = user_profile.get('concerns', [])
        age_range = user_profile.get('ageRange', 'Unknown')
        
        analysis_text = f"Based on your {skin_type} skin type and {age_range} age range, "
        
        if concerns:
            analysis_text += f"your main concerns are {', '.join(concerns)}. "
        
        analysis_text += "We recommend focusing on gentle, consistent skincare practices suitable for your skin type."
        
        if acne_detections and len(acne_detections) > 0:
            analysis_text += f" Our analysis detected {len(acne_detections)} areas of concern that may benefit from targeted treatment."
        
        return {
            "consultation": analysis_text,
            "recommendations": "Maintain a consistent routine with products suitable for your skin type."
        }
