import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from supabase import create_client, Client
import os
from typing import List, Dict, Optional, Tuple
import json
from datetime import datetime
from gemini_service import GeminiAI

class ProductRecommenderSupabase:
    def __init__(self, supabase_url: str = None, supabase_key: str = None):
        """Initialize the recommender with Supabase connection and AI services."""
        self.supabase_url = supabase_url or os.getenv('SUPABASE_URL')
        self.supabase_key = supabase_key or os.getenv('SUPABASE_ANON_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Supabase URL and key must be provided either as parameters or environment variables")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        self.df = None
        self.tfidf = None
        self.tfidf_matrix = None
        self.cosine_sim = None
        
        # Initialize Gemini AI service
        try:
            self.gemini_ai = GeminiAI()
            print("✅ Gemini AI service initialized")
        except Exception as e:
            print(f"⚠️ Gemini AI initialization failed: {e}")
            self.gemini_ai = None
        
        # Load and prepare data on initialization
        self._load_data_from_supabase()
        if self.df is not None and not self.df.empty:
            self._build_recommendation_system()

    def _load_data_from_supabase(self):
        """Load product data from Supabase with improved error handling."""
        try:
            print("Loading products from Supabase...")
            response = self.supabase.table('products').select('*').execute()
            
            if not response.data:
                print("⚠️ No products found in Supabase database")
                self.df = pd.DataFrame()
                return
            
            # Convert to DataFrame
            self.df = pd.DataFrame(response.data)
            print(f"Loaded {len(self.df)} products from Supabase")
            
            # Prepare data
            self._prepare_data()
            
        except Exception as e:
            print(f"Error loading data from Supabase: {str(e)}")
            self.df = pd.DataFrame()

    def _prepare_data(self):
        """Clean and prepare the data for recommendations with enhanced processing."""
        if self.df is None or self.df.empty:
            return
            
        # Handle missing values with better defaults
        self.df['brand'] = self.df['brand'].fillna('Unknown Brand')
        self.df['skin_type'] = self.df['skin_type'].fillna('All')
        self.df['product_benefits'] = self.df['product_benefits'].fillna('')
        self.df['about_item'] = self.df['about_item'].fillna('')
        self.df['active_ingredients'] = self.df['active_ingredients'].fillna('')
        self.df['product_name'] = self.df['product_name'].fillna('Unknown Product')
        
        # Ensure numeric fields are properly handled
        self.df['price'] = pd.to_numeric(self.df['price'], errors='coerce').fillna(0)
        self.df['rating'] = pd.to_numeric(self.df['rating'], errors='coerce').fillna(3.0)
        
        # Create enhanced content field for better matching
        content_fields = ['product_name', 'brand', 'product_benefits', 'active_ingredients', 'about_item', 'skin_type']
        self.df['content'] = self.df[content_fields].fillna('').astype(str).apply(
            lambda x: ' '.join(x).lower(), axis=1
        )
        
        # Create price categories with better ranges
        self.df['price_category'] = pd.cut(
            self.df['price'], 
            bins=[0, 500, 1500, 3000, float('inf')], 
            labels=['Budget', 'Mid-range', 'Premium', 'Luxury']
        )
        
        # Create rating categories
        self.df['rating_category'] = pd.cut(
            self.df['rating'], 
            bins=[0, 3.0, 4.0, 4.5, 5.0], 
            labels=['Below Average', 'Good', 'Very Good', 'Excellent']
        )

    def _build_recommendation_system(self):
        """Build the TF-IDF recommendation system with improved parameters."""
        if self.df is None or self.df.empty:
            print("⚠️ No data available to build recommendation system")
            return
        
        try:
            print("Building recommendation system...")
            self.tfidf = TfidfVectorizer(
                max_features=10000, 
                stop_words='english', 
                ngram_range=(1, 3), 
                min_df=1,  # More lenient for smaller datasets
                max_df=0.95
            )
            
            self.tfidf_matrix = self.tfidf.fit_transform(self.df['content'])
            self.cosine_sim = cosine_similarity(self.tfidf_matrix)
            print("Recommendation system built successfully")
        except Exception as e:
            print(f"Error building recommendation system: {e}")
            self.tfidf = None
            self.tfidf_matrix = None
            self.cosine_sim = None

    def recommend(self, preferences: Dict, num_recommendations: int = 15, use_ai_enhancement: bool = True) -> List[Dict]:
        """Generate enhanced product recommendations using logic + AI."""
        print(f"Generating recommendations with preferences: {preferences}")
        
        # Get logic-based recommendations first
        logic_recommendations = self._get_logic_based_recommendations(preferences, num_recommendations * 2)
        
        if not logic_recommendations:
            print("⚠️ No logic-based recommendations found")
            return []
        
        # If AI enhancement is enabled and available, enhance with Gemini AI
        if use_ai_enhancement and self.gemini_ai:
            try:
                # Prepare data for AI enhancement
                product_database = self.df.to_dict('records')
                user_profile = {
                    'skinType': preferences.get('skin_type', 'Unknown'),
                    'ageRange': preferences.get('age_group', 'Unknown'),
                    'concerns': preferences.get('skin_concerns', []),
                    'preferredIngredients': preferences.get('ingredients', []),
                    'avoidIngredients': preferences.get('avoid_ingredients', []),
                    'budget': preferences.get('price_range', 'Unknown')
                }
                
                # Get AI-enhanced recommendations
                ai_recommendations = self.gemini_ai.generate_ai_product_recommendations(
                    user_profile, 
                    product_database, 
                    logic_recommendations
                )
                
                # Combine logic and AI recommendations
                final_recommendations = self._combine_recommendations(
                    logic_recommendations, 
                    ai_recommendations, 
                    num_recommendations
                )
                
                print(f"✅ Generated {len(final_recommendations)} hybrid recommendations")
                return final_recommendations
                
            except Exception as e:
                print(f"⚠️ AI enhancement failed, using logic-based recommendations: {e}")
        
        # Return logic-based recommendations if AI is not available
        return logic_recommendations[:num_recommendations]

    def _get_logic_based_recommendations(self, preferences: Dict, num_recommendations: int) -> List[Dict]:
        """Get logic-based recommendations with improved filtering."""
        if self.df is None or self.df.empty:
            return []
        
        # Apply intelligent filtering
        filtered_df = self._intelligent_filter_products(preferences)
        
        if filtered_df.empty:
            print("No products found with strict filters, using fallback strategy...")
            filtered_df = self._fallback_filter_strategy(preferences)
        
        if filtered_df.empty:
            print("No products found even with fallback, returning empty list")
            return []
        
        # Calculate enhanced scores
        scores = self._calculate_enhanced_scores(filtered_df, preferences)
        filtered_df = filtered_df.copy()
        filtered_df['recommendation_score'] = scores
        
        # Get top recommendations
        recommendations = filtered_df.nlargest(num_recommendations, 'recommendation_score')
        
        # Format for frontend
        return self._format_recommendations(recommendations, preferences)

    def _intelligent_filter_products(self, preferences: Dict) -> pd.DataFrame:
        """Apply intelligent filtering with scoring approach."""
        filtered_df = self.df.copy()
        print(f"Starting with {len(filtered_df)} total products")
        
        # Initialize scoring columns
        filtered_df['skin_type_score'] = 0
        filtered_df['concern_score'] = 0
        filtered_df['ingredient_score'] = 0
        filtered_df['price_score'] = 0
        
        # Skin type scoring (flexible matching)
        skin_type = preferences.get('skin_type', '').lower()
        if skin_type and skin_type != "any":
            skin_keywords = {
                'dry': ['dry', 'all', 'normal', 'sensitive'],
                'oily': ['oily', 'all', 'combination', 'normal'],
                'sensitive': ['sensitive', 'all', 'normal', 'dry'],
                'normal': ['normal', 'all', 'sensitive'],
                'combination': ['combination', 'all', 'oily', 'normal']
            }
            
            if skin_type in skin_keywords:
                for keyword in skin_keywords[skin_type]:
                    mask = filtered_df['skin_type'].str.contains(keyword, case=False, na=False)
                    filtered_df.loc[mask, 'skin_type_score'] += 3

        # Concern-based scoring with expanded patterns
        skin_concerns = preferences.get('skin_concerns', [])
        if skin_concerns:
            benefit_patterns = {
                'acne': ['acne', 'pimple', 'blemish', 'blackhead', 'salicylic', 'anti.?acne'],
                'dark spots': ['dark.?spot', 'hyperpigment', 'melasma', 'brighten', 'even.?tone'],
                'oily t-zone': ['oil.?control', 'sebum', 'mattif', 'pore', 'combination'],
                'fine lines': ['fine.?line', 'wrinkle', 'anti.?age', 'retinol', 'collagen'],
                'large pores': ['pore', 'niacinamide', 'bha', 'salicylic'],
                'dryness': ['dry', 'moistur', 'hydrat', 'barrier'],
                'sensitivity': ['sensitive', 'gentle', 'sooth', 'calm'],
                'brightening': ['brighten', 'vitamin.?c', 'glow', 'radiant'],
                'anti-aging': ['anti.?age', 'retinol', 'peptide', 'collagen']
            }
            
            for concern in skin_concerns:
                concern_lower = concern.lower()
                if concern_lower in benefit_patterns:
                    pattern = '|'.join(benefit_patterns[concern_lower])
                    for field in ['product_benefits', 'about_item', 'content']:
                        if field in filtered_df.columns:
                            mask = filtered_df[field].str.contains(pattern, case=False, na=False)
                            filtered_df.loc[mask, 'concern_score'] += 2

        # Ingredient scoring (bonus for preferred, penalty for avoided)
        preferred_ingredients = preferences.get('ingredients', [])
        for ingredient in preferred_ingredients:
            mask = filtered_df['content'].str.contains(ingredient, case=False, na=False)
            filtered_df.loc[mask, 'ingredient_score'] += 2
        
        avoid_ingredients = preferences.get('avoid_ingredients', [])
        for ingredient in avoid_ingredients:
            mask = filtered_df['content'].str.contains(ingredient, case=False, na=False)
            filtered_df.loc[mask, 'ingredient_score'] -= 3

        # Price range filtering (keep products within 50% extension if needed)
        price_range = preferences.get('price_range')
        if price_range and len(price_range) == 2:
            min_price, max_price = price_range
            
            # First try exact range
            price_mask = (filtered_df['price'] >= min_price) & (filtered_df['price'] <= max_price) & (filtered_df['price'] > 0)
            
            if price_mask.sum() < 50:  # If too few products, extend range
                extended_min = max(0, min_price * 0.5)
                extended_max = max_price * 1.5
                price_mask = (filtered_df['price'] >= extended_min) & (filtered_df['price'] <= extended_max) & (filtered_df['price'] > 0)
                print(f"Extended price range to {extended_min}-{extended_max} to get more products")
            
            if price_mask.sum() > 0:
                filtered_df = filtered_df[price_mask]
            else:
                print("No products in price range, keeping all priced products")
                filtered_df = filtered_df[filtered_df['price'] > 0]

        # Calculate total filter score
        filtered_df['total_filter_score'] = (
            filtered_df['skin_type_score'] + 
            filtered_df['concern_score'] + 
            filtered_df['ingredient_score']
        )
        
        # Keep products with positive scores or high ratings
        good_products = filtered_df[
            (filtered_df['total_filter_score'] > 0) | 
            (filtered_df['rating'] >= 4.0)
        ]
        
        if len(good_products) >= 50:
            filtered_df = good_products
        
        print(f"After intelligent filtering: {len(filtered_df)} products")
        return filtered_df

    def _fallback_filter_strategy(self, preferences: Dict) -> pd.DataFrame:
        """Fallback strategy when strict filtering returns no results."""
        print("Using fallback filtering strategy...")
        
        # Start with all products
        fallback_df = self.df.copy()
        
        # Apply only essential filters
        price_range = preferences.get('price_range')
        if price_range and len(price_range) == 2:
            min_price, max_price = price_range
            # Use wider price range for fallback
            extended_min = max(0, min_price * 0.3)
            extended_max = max_price * 2
            fallback_df = fallback_df[
                (fallback_df['price'] >= extended_min) & 
                (fallback_df['price'] <= extended_max) & 
                (fallback_df['price'] > 0)
            ]
        
        # If still empty, return top-rated products
        if fallback_df.empty:
            fallback_df = self.df.dropna(subset=['rating']).nlargest(100, 'rating')
        
        print(f"Fallback strategy returned {len(fallback_df)} products")
        return fallback_df

    def _calculate_enhanced_scores(self, df: pd.DataFrame, preferences: Dict) -> List[float]:
        """Calculate enhanced recommendation scores."""
        scores = []
        
        for _, product in df.iterrows():
            score = 0
            
            # Rating score (40% weight)
            if pd.notna(product['rating']) and product['rating'] > 0:
                rating_score = (product['rating'] / 5.0) * 40
                score += rating_score
            else:
                score += 20  # Default score for products without ratings
            
            # Price value score (20% weight)
            if pd.notna(product['price']) and product['price'] > 0:
                # Inverse price scoring - lower prices get higher scores within range
                price_range = preferences.get('price_range', [0, 5000])
                if len(price_range) == 2:
                    min_price, max_price = price_range
                    if min_price <= product['price'] <= max_price:
                        # Normalize price within range (lower = better)
                        if max_price > min_price:
                            price_score = (1 - (product['price'] - min_price) / (max_price - min_price)) * 20
                            score += price_score
                        else:
                            score += 20
            
            # Filter score (40% weight) - from intelligent filtering
            if 'total_filter_score' in product:
                filter_score = min(product['total_filter_score'] * 4, 40)  # Cap at 40
                score += filter_score
            
            scores.append(max(score, 10))  # Minimum score of 10
        
        return scores

    def _combine_recommendations(self, logic_recs: List[Dict], ai_recs: List[Dict], limit: int) -> List[Dict]:
        """Combine logic and AI recommendations intelligently."""
        if not ai_recs:
            return logic_recs[:limit]
        
        # Create a combined list, prioritizing AI recommendations
        combined = []
        used_names = set()
        
        # Add AI recommendations first (they're usually more targeted)
        for rec in ai_recs:
            if rec['name'] not in used_names:
                combined.append(rec)
                used_names.add(rec['name'])
                if len(combined) >= limit:
                    break
        
        # Fill remaining slots with logic recommendations
        for rec in logic_recs:
            if len(combined) >= limit:
                break
            if rec['name'] not in used_names:
                combined.append(rec)
                used_names.add(rec['name'])
        
        return combined[:limit]

    def _format_recommendations(self, recommendations: pd.DataFrame, preferences: Dict) -> List[Dict]:
        """Format recommendations for frontend with enhanced details."""
        formatted_recommendations = []
        
        for _, product in recommendations.iterrows():
            # Generate match reasons based on scoring
            match_reasons = []
            
            if hasattr(product, 'skin_type_score') and product.get('skin_type_score', 0) > 0:
                match_reasons.append(f"Suitable for {preferences.get('skin_type', 'your')} skin")
            
            if hasattr(product, 'concern_score') and product.get('concern_score', 0) > 0:
                concerns = preferences.get('skin_concerns', [])
                if concerns:
                    match_reasons.append(f"Addresses {', '.join(concerns[:2])}")
            
            if hasattr(product, 'ingredient_score') and product.get('ingredient_score', 0) > 0:
                preferred = preferences.get('ingredients', [])
                if preferred:
                    match_reasons.append(f"Contains preferred ingredients")
            
            if pd.notna(product.get('rating')) and product.get('rating', 0) >= 4.0:
                match_reasons.append(f"Highly rated ({product.get('rating', 0):.1f}/5)")
            
            # Ensure we have at least one match reason
            if not match_reasons:
                match_reasons.append("Quality product for your skin type")
            
            formatted_product = {
                'name': str(product.get('product_name', 'Unknown Product')),
                'description': self._truncate_text(str(product.get('about_item', 'No description available')), 200),
                'price': f"₹{int(product.get('price', 0))}" if pd.notna(product.get('price')) and product.get('price', 0) > 0 else 'Price not available',
                'ingredients': str(product.get('active_ingredients', product.get('ingredients', 'Ingredients not listed'))),
                'suitableFor': str(product.get('skin_type', 'All skin types')),
                'brand': str(product.get('brand', 'Unknown Brand')),
                'rating': float(product.get('rating', 0)) if pd.notna(product.get('rating')) else 0,
                'category': str(product.get('category', 'Skincare')),
                'matchReasons': match_reasons
            }
            formatted_recommendations.append(formatted_product)
        
        return formatted_recommendations

    def generate_skincare_routine(self, preferences: Dict, acne_detected: bool = False) -> Dict:
        """Generate a personalized skincare routine using AI if available."""
        if not self.gemini_ai:
            return self._generate_basic_routine(preferences, acne_detected)
        
        try:
            # Get recommended products for routine generation
            recommended_products = self.recommend(preferences, num_recommendations=20, use_ai_enhancement=False)
            
            # Prepare user profile for AI
            user_profile = {
                'skinType': preferences.get('skin_type', 'Unknown'),
                'ageRange': preferences.get('age_group', 'Unknown'),
                'concerns': preferences.get('skin_concerns', []),
                'preferredIngredients': preferences.get('ingredients', []),
                'avoidIngredients': preferences.get('avoid_ingredients', []),
                'budget': preferences.get('price_range', 'Unknown')
            }
            
            # Generate AI-powered routine
            routine = self.gemini_ai.generate_skincare_routine(
                user_profile, 
                recommended_products, 
                acne_detected
            )
            
            return routine
            
        except Exception as e:
            print(f"AI routine generation failed: {e}")
            return self._generate_basic_routine(preferences, acne_detected)

    def _generate_basic_routine(self, preferences: Dict, acne_detected: bool) -> Dict:
        """Generate a basic rule-based routine as fallback."""
        # Get some recommended products
        products = self.recommend(preferences, num_recommendations=10, use_ai_enhancement=False)
        
        # Categorize products
        cleansers = [p for p in products if 'cleanser' in p.get('category', '').lower() or 'wash' in p.get('name', '').lower()]
        serums = [p for p in products if 'serum' in p.get('category', '').lower() or 'serum' in p.get('name', '').lower()]
        moisturizers = [p for p in products if 'moisturizer' in p.get('category', '').lower() or 'cream' in p.get('name', '').lower()]
        sunscreens = [p for p in products if 'sunscreen' in p.get('name', '').lower() or 'spf' in p.get('name', '').lower()]
        
        # Build routine steps
        morning_routine = []
        evening_routine = []
        
        # Morning routine
        if cleansers:
            morning_routine.append({
                'step': 'Cleanse',
                'instruction': f"Use {cleansers[0]['name']} to gently cleanse your face with lukewarm water.",
                'product': cleansers[0]
            })
        
        if serums:
            morning_routine.append({
                'step': 'Treat',
                'instruction': f"Apply {serums[0]['name']} to address your skin concerns.",
                'product': serums[0]
            })
        
        if moisturizers:
            morning_routine.append({
                'step': 'Moisturize',
                'instruction': f"Apply {moisturizers[0]['name']} to hydrate and protect your skin.",
                'product': moisturizers[0]
            })
        
        if sunscreens:
            morning_routine.append({
                'step': 'Protect',
                'instruction': f"Apply {sunscreens[0]['name']} for sun protection.",
                'product': sunscreens[0]
            })
        
        # Evening routine
        if cleansers:
            evening_routine.append({
                'step': 'Cleanse',
                'instruction': f"Use {cleansers[0]['name']} to remove the day's impurities.",
                'product': cleansers[0]
            })
        
        if len(serums) > 1:
            evening_routine.append({
                'step': 'Treat',
                'instruction': f"Apply {serums[1]['name']} for overnight skin repair.",
                'product': serums[1]
            })
        elif serums:
            evening_routine.append({
                'step': 'Treat',
                'instruction': f"Apply {serums[0]['name']} for skin treatment.",
                'product': serums[0]
            })
        
        if moisturizers:
            evening_routine.append({
                'step': 'Moisturize',
                'instruction': f"Apply {moisturizers[0]['name']} for overnight hydration.",
                'product': moisturizers[0]
            })
        
        return {
            'morning': morning_routine,
            'evening': evening_routine,
            'weekly': []
        }

    def generate_skin_analysis(self, user_profile: Dict, acne_detections: List = None) -> str:
        """Generate AI-powered skin analysis."""
        if not self.gemini_ai:
            return self._generate_basic_analysis(user_profile, acne_detections)
        
        try:
            return self.gemini_ai.generate_skin_analysis(user_profile, acne_detections)
        except Exception as e:
            print(f"AI skin analysis failed: {e}")
            return self._generate_basic_analysis(user_profile, acne_detections)

    def _generate_basic_analysis(self, user_profile: Dict, acne_detections: List = None) -> str:
        """Generate basic skin analysis as fallback."""
        skin_type = user_profile.get('skinType', 'Unknown')
        age_range = user_profile.get('ageRange', 'Unknown')
        concerns = user_profile.get('concerns', [])
        
        analysis = f"Based on your {skin_type} skin type and age range ({age_range}), "
        
        if concerns:
            analysis += f"your main concerns are {', '.join(concerns)}. "
        
        if acne_detections and len(acne_detections) > 0:
            analysis += f"Our AI detected {len(acne_detections)} areas of concern in your facial image. "
        
        analysis += "We recommend following a consistent skincare routine with products suited to your specific needs."
        
        return analysis

    def _truncate_text(self, text: str, max_length: int) -> str:
        """Truncate text to specified length with ellipsis."""
        if not text or len(text) <= max_length:
            return text
        return text[:max_length].rstrip() + '...'

    def refresh_data(self):
        """Refresh data from Supabase and rebuild recommendation system."""
        self._load_data_from_supabase()
        if self.df is not None and not self.df.empty:
            self._build_recommendation_system()
            print("Data refreshed successfully")
        else:
            print("Failed to refresh data")