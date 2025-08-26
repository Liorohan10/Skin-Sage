# Product Recommendation Logic using Supabase and Gemini AI
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from gemini_service import GeminiAIService
import json
from typing import Dict, List, Optional, Any
import datetime
import traceback

# Load environment variables
load_dotenv()

class ProductRecommenderSupabase:
    def __init__(self):
        # Initialize Supabase client
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_ANON_KEY")
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials. Please check your .env file.")
        
        self.supabase: Client = create_client(url, key)
        self.df = None
        self.tfidf = None
        self.tfidf_matrix = None
        self.cosine_sim = None
        
        # Initialize Gemini AI service
        try:
            self.gemini_ai = GeminiAIService()
            print("✅ Gemini AI service initialized")
        except Exception as e:
            print(f"⚠️ Gemini AI not available: {e}")
            self.gemini_ai = None
        
        self._load_and_prepare_data()

    def _load_and_prepare_data(self):
        """Load product data from Supabase and prepare for recommendations"""
        try:
            # Fetch all products from Supabase
            print("Loading products from Supabase...")
            response = self.supabase.table('products').select('*').execute()
            
            if not response.data:
                raise ValueError("No products found in Supabase database")
            
            # Convert to DataFrame
            self.df = pd.DataFrame(response.data)
            print(f"Loaded {len(self.df)} products from Supabase")
            
            # Clean and prepare data
            self.df = self.df.drop_duplicates(subset=['asin']).copy()
            self.df['price'] = pd.to_numeric(self.df['price'], errors='coerce')
            self.df['rating'] = pd.to_numeric(self.df['rating'], errors='coerce')
            self.df['brand'] = self.df['brand'].fillna('Unknown Brand')
            self.df['skin_type'] = self.df['skin_type'].fillna('All')
            self.df['product_benefits'] = self.df['product_benefits'].fillna('')
            self.df['about_item'] = self.df['about_item'].fillna('')
            self.df['active_ingredients'] = self.df['active_ingredients'].fillna('')
            
            # Create content field for similarity matching
            content_fields = ['product_name', 'brand', 'product_benefits', 'active_ingredients', 'about_item', 'skin_type']
            self.df['content'] = self.df[content_fields].fillna('').astype(str).apply(lambda x: ' '.join(x), axis=1)
            
            # Create price and rating categories
            self.df['price_category'] = pd.cut(self.df['price'], bins=[0, 300, 600, 1000, float('inf')], labels=['Budget', 'Mid-range', 'Premium', 'Luxury'])
            self.df['rating_category'] = pd.cut(self.df['rating'], bins=[0, 3.0, 4.0, 4.5, 5.0], labels=['Below Average', 'Good', 'Very Good', 'Excellent'])
            
            # Build recommendation system
            self._build_advanced_recommendation_system()
            
        except Exception as e:
            print(f"Error loading data from Supabase: {e}")
            raise

    def _build_advanced_recommendation_system(self):
        """Build TF-IDF vectorizer and cosine similarity matrix"""
        try:
            self.tfidf = TfidfVectorizer(max_features=8000, stop_words='english', ngram_range=(1, 3), min_df=2, max_df=0.9)
            self.tfidf_matrix = self.tfidf.fit_transform(self.df['content'])
            self.cosine_sim = cosine_similarity(self.tfidf_matrix)
            print("Recommendation system built successfully")
        except Exception as e:
            print(f"Error building recommendation system: {e}")
            # Fallback to simple recommendation without TF-IDF
            self.tfidf = None
            self.tfidf_matrix = None
            self.cosine_sim = None

    def recommend(self, preferences, num_recommendations=10, use_ai_enhancement=True):
        """Get product recommendations using hybrid logic + AI approach"""
        print(f"Recommending with preferences: {preferences}")
        
        if self.df is None or self.df.empty:
            print("No product data available")
            return []
        
        # Step 1: Get logic-based recommendations
        logic_recommendations = self._get_logic_based_recommendations(preferences, num_recommendations)
        print(f"Logic-based recommendations: {len(logic_recommendations)} products")
        
        # Step 2: Get AI-enhanced recommendations if enabled and available
        ai_recommendations = []
        if use_ai_enhancement and self.gemini_ai:
            try:
                print("Getting AI-enhanced recommendations...")
                
                # Prepare product database for AI
                product_database = self.df.to_dict('records')
                
                # Prepare user profile for AI
                user_profile = {
                    'skinType': preferences.get('skin_type', 'Unknown'),
                    'ageRange': preferences.get('age_group', 'Unknown'),
                    'concerns': preferences.get('skin_concerns', []),
                    'preferredIngredients': preferences.get('ingredients', []),
                    'avoidIngredients': preferences.get('avoid_ingredients', []),
                    'budget': preferences.get('price_range', 'Unknown')
                }
                
                # Log the AI request
                self._log_ai_interaction(
                    interaction_type="product_recommendations_request",
                    query="Requesting AI product recommendations",
                    user_profile=user_profile,
                    metadata={
                        "logic_recommendations_count": len(logic_recommendations),
                        "product_database_size": len(product_database),
                        "preferences": preferences
                    }
                )
                
                ai_recommendations = self.gemini_ai.generate_ai_product_recommendations(
                    user_profile, 
                    product_database, 
                    logic_recommendations
                )
                
                # Log successful AI response
                self._log_ai_interaction(
                    interaction_type="product_recommendations_success",
                    query="AI product recommendations completed",
                    response={
                        "recommendations_count": len(ai_recommendations),
                        "recommendations": [{"name": rec.get("name", "Unknown"), "reasoning": rec.get("ai_reasoning", "")} for rec in ai_recommendations[:5]]  # First 5 for brevity
                    },
                    user_profile=user_profile,
                    metadata={"total_recommendations": len(ai_recommendations)}
                )
                
                print(f"AI-enhanced recommendations: {len(ai_recommendations)} products")
                
            except Exception as e:
                # Log AI error
                self._log_ai_interaction(
                    interaction_type="product_recommendations_error",
                    query="AI product recommendations failed",
                    error=e,
                    user_profile=user_profile,
                    metadata={"preferences": preferences}
                )
                print(f"AI enhancement failed, using logic-only: {e}")
        
        # Step 3: Combine and rank recommendations intelligently
        final_recommendations = self._combine_recommendations(
            logic_recommendations, 
            ai_recommendations, 
            num_recommendations
        )
        
        print(f"Final hybrid recommendations: {len(final_recommendations)} products")
        return final_recommendations

    def _get_logic_based_recommendations(self, preferences, num_recommendations):
        """Get recommendations using the existing logic-based system"""
        df = self._smart_filter_products(self.df, preferences)
        print(f"Filtered dataframe has {len(df)} products")
        
        if df.empty:
            print("No products found after filtering, trying with relaxed filters...")
            # Try with just price filter if no products found
            df = self.df.copy()
            price_range = preferences.get('price_range')
            if price_range:
                min_price, max_price = price_range
                df = df[(df['price'] >= min_price) & (df['price'] <= max_price) & (df['price'].notna())]
                print(f"With relaxed filters: {len(df)} products")
            
            # If still empty, just take top products by rating
            if df.empty:
                print("Still no products, using top rated products...")
                df = self.df.copy()
                df = df.dropna(subset=['rating']).nlargest(num_recommendations, 'rating')
                print(f"Using top rated products: {len(df)} products")
            
        if df.empty:
            print("No products found even after fallbacks")
            return []
            
        # Calculate recommendation scores
        scores = []
        # User range for price centering
        pr = preferences.get('price_range') or (0, 0)
        user_min, user_max = pr if isinstance(pr, (list, tuple)) and len(pr) == 2 else (0, 0)
        user_mid = (user_min + user_max) / 2.0 if user_max > user_min else None
        user_half = max((user_max - user_min) / 2.0, 1.0) if user_max > user_min else None
        for idx, product in df.iterrows():
            score = 0
            
            # Base rating score (40% weight)
            if pd.notna(product['rating']):
                score += (product['rating'] / 5.0) * 0.4
            
            # Price score (20% weight) - center around user's mid range
            if pd.notna(product['price']) and user_mid is not None:
                rel = max(0.0, 1.0 - abs(product['price'] - user_mid) / user_half)
                score += rel * 0.2
            
            # Filter score (40% weight) - from intelligent filtering
            if 'total_filter_score' in product:
                max_filter_score = df['total_filter_score'].max() if df['total_filter_score'].max() > 0 else 1
                normalized_filter_score = product['total_filter_score'] / max_filter_score
                score += normalized_filter_score * 0.4
            else:
                score += 0.2  # Base content score if no filter score
                
            scores.append(score)
        
        df = df.copy()
        df['recommendation_score'] = scores
        recommendations = df.nlargest(num_recommendations * 2, 'recommendation_score')  # Get more for combining
        
        # Transform the data to match frontend expectations
        formatted_recommendations = []
        for _, product in recommendations.iterrows():
            formatted_product = {
                'name': product.get('product_name', 'Unknown Product'),
                'description': self._truncate_text(product.get('about_item', 'No description available'), 200),
                'price': f"₹{product.get('price', 0)}" if pd.notna(product.get('price')) else 'Price not available',
                'ingredients': product.get('active_ingredients', product.get('ingredients', 'Ingredients not listed')),
                'suitableFor': product.get('skin_type', 'All skin types'),
                'brand': product.get('brand', 'Unknown Brand'),
                'rating': product.get('rating', 'No rating'),
                'image': product.get('product_image', ''),
                'link': product.get('link_href', ''),
                'logic_score': product.get('recommendation_score', 0),
                'recommendation_source': 'logic',
                'matchReasons': [
                    f"Suitable for {product.get('skin_type', 'all skin types')}",
                    f"Contains {product.get('active_ingredients', 'beneficial ingredients')}",
                    f"Rated {product.get('rating', 'well')} by customers"
                ]
            }
            formatted_recommendations.append(formatted_product)
        
        return formatted_recommendations

    def _combine_recommendations(self, logic_recs, ai_recs, num_recommendations):
        """Intelligently combine logic-based and AI recommendations"""
        if not ai_recs:
            return logic_recs[:num_recommendations]
        
        if not logic_recs:
            return ai_recs[:num_recommendations]
        
        # Create combined list with scoring
        combined_products = {}
        
        # Add logic-based recommendations with their scores
        for i, product in enumerate(logic_recs):
            product_key = product['name'].lower()
            combined_products[product_key] = {
                **product,
                'logic_score': product.get('logic_score', 0),
                'logic_rank': i + 1,
                'ai_score': 0,
                'ai_rank': None,
                'has_logic': True,
                'has_ai': False
            }
        
        # Add AI recommendations and merge with existing
        for i, product in enumerate(ai_recs):
            product_key = product['name'].lower()
            
            if product_key in combined_products:
                # Product exists in logic recommendations - boost its score
                combined_products[product_key]['ai_score'] = 1.0 - (i / len(ai_recs))  # Higher score for higher AI rank
                combined_products[product_key]['ai_rank'] = i + 1
                combined_products[product_key]['has_ai'] = True
                combined_products[product_key]['ai_reasoning'] = product.get('ai_reasoning', '')
                combined_products[product_key]['recommendation_source'] = 'hybrid'
                
                # Update match reasons to include AI insights
                ai_reason = product.get('ai_reasoning', 'AI recommended')
                combined_products[product_key]['matchReasons'].insert(0, f"AI Expert: {ai_reason}")
                
            else:
                # New product from AI - add it
                combined_products[product_key] = {
                    **product,
                    'logic_score': 0,
                    'logic_rank': None,
                    'ai_score': 1.0 - (i / len(ai_recs)),
                    'ai_rank': i + 1,
                    'has_logic': False,
                    'has_ai': True,
                    'recommendation_source': 'ai'
                }
        
        # Calculate final hybrid scores
        for product_key, product in combined_products.items():
            hybrid_score = 0
            
            # Logic score contribution (60% if available)
            if product['has_logic']:
                logic_weight = 0.6
                normalized_logic = product['logic_score']
                hybrid_score += normalized_logic * logic_weight
            
            # AI score contribution (40% base, 70% if no logic)
            if product['has_ai']:
                ai_weight = 0.4 if product['has_logic'] else 0.7
                hybrid_score += product['ai_score'] * ai_weight
            
            # Bonus for products recommended by both systems
            if product['has_logic'] and product['has_ai']:
                hybrid_score += 0.2  # 20% bonus for consensus
            
            # Priority boost for high-priority AI recommendations
            if product.get('ai_priority') == 'high':
                hybrid_score += 0.1
            
            product['hybrid_score'] = hybrid_score
        
        # Sort by hybrid score and return top recommendations
        sorted_products = sorted(
            combined_products.values(), 
            key=lambda x: x['hybrid_score'], 
            reverse=True
        )
        
        # Add diversity check to ensure category variety
        final_recommendations = self._ensure_category_diversity(sorted_products, num_recommendations)
        
        # Log the final selection for debugging
        print("Final recommendation breakdown:")
        for i, prod in enumerate(final_recommendations[:10]):
            source = prod.get('recommendation_source', 'unknown')
            score = prod.get('hybrid_score', 0)
            print(f"  {i+1}. {prod['name'][:40]}... | Source: {source} | Score: {score:.3f}")
        
        return final_recommendations

    def _ensure_category_diversity(self, sorted_products, num_recommendations):
        """Ensure diversity across product categories in final recommendations"""
        categories_seen = {}
        diversified_products = []
        remaining_products = []
        
        # First pass: ensure category diversity
        for product in sorted_products:
            category = product.get('ai_category', 'general').lower()
            
            # Allow up to 3 products per category initially
            if categories_seen.get(category, 0) < 3:
                diversified_products.append(product)
                categories_seen[category] = categories_seen.get(category, 0) + 1
            else:
                remaining_products.append(product)
            
            if len(diversified_products) >= num_recommendations:
                break
        
        # Second pass: fill remaining slots with highest-scoring products
        if len(diversified_products) < num_recommendations:
            needed = num_recommendations - len(diversified_products)
            diversified_products.extend(remaining_products[:needed])
        
        return diversified_products[:num_recommendations]

    def _smart_filter_products(self, df, preferences):
        """Filter products based on user preferences with scoring instead of hard filtering"""
        print(f"Starting with {len(df)} total products")
        filtered_df = df.copy()
        
        # Add scoring columns for intelligent filtering
        filtered_df['skin_type_score'] = 0
        filtered_df['price_score'] = 0
        filtered_df['concern_score'] = 0
        filtered_df['ingredient_score'] = 0

        # Skin Type Scoring (not filtering)
        skin_type = preferences.get('skin_type')
        if skin_type and skin_type != "Any":
            print(f"Scoring by skin type: {skin_type}")
            skin_type_lower = skin_type.lower()
            skin_keywords = {
                'dry': ['dry', 'all', 'normal', 'sensitive'],
                'oily': ['oily', 'all', 'combination', 'normal'],
                'sensitive': ['sensitive', 'all', 'normal', 'dry'],
                'normal': ['normal', 'all', 'sensitive'],
                'combination': ['combination', 'all', 'oily', 'normal']
            }
            if skin_type_lower in skin_keywords:
                pattern = '|'.join(skin_keywords[skin_type_lower])
                # Give higher scores to exact matches, lower to compatible types
                exact_match = filtered_df['skin_type'].str.contains(skin_type_lower, case=False, na=False)
                compatible_match = filtered_df['skin_type'].str.contains(pattern, case=False, na=True)
                filtered_df.loc[exact_match, 'skin_type_score'] = 3
                filtered_df.loc[compatible_match & ~exact_match, 'skin_type_score'] = 2
                filtered_df.loc[~compatible_match, 'skin_type_score'] = 1

        # Price Range Filtering (hard filter with controlled expansion)
        price_range = preferences.get('price_range')
        if price_range:
            min_price, max_price = price_range
            print(f"Filtering by price range: {min_price} - {max_price}")
            # Keep products within 150% of max price to account for currency differences
            # First, try strict in-range
            in_price_range = (filtered_df['price'] >= min_price) & (filtered_df['price'] <= max_price) & (filtered_df['price'].notna())
            before_count = len(filtered_df)
            filtered_df = filtered_df[in_price_range]
            print(f"After price filter: {len(filtered_df)} products (was {before_count})")
            
            # If too few products after price filter, expand the range in a bounded way
            if len(filtered_df) < 10:
                print("Too few products after price filter, expanding range...")
                # Expand by +/- 15% around preferred range
                expand_min = max(0, int(min_price * 0.85))
                expand_max = int(max_price * 1.25)
                expanded = df[(df['price'].notna()) & (df['price'] >= expand_min) & (df['price'] <= expand_max)].copy()
                filtered_df = expanded
                for col in ['skin_type_score', 'price_score', 'concern_score', 'ingredient_score']:
                    if col not in filtered_df.columns:
                        filtered_df[col] = 0
                # Re-apply skin type scoring since we rebuilt filtered_df
                if skin_type and skin_type != "Any":
                    skin_type_lower = skin_type.lower()
                    skin_keywords = {
                        'dry': ['dry', 'all', 'normal', 'sensitive'],
                        'oily': ['oily', 'all', 'combination', 'normal'],
                        'sensitive': ['sensitive', 'all', 'normal', 'dry'],
                        'normal': ['normal', 'all', 'sensitive'],
                        'combination': ['combination', 'all', 'oily', 'normal']
                    }
                    if skin_type_lower in skin_keywords:
                        pattern = '|'.join(skin_keywords[skin_type_lower])
                        exact_match = filtered_df['skin_type'].str.contains(skin_type_lower, case=False, na=False)
                        compatible_match = filtered_df['skin_type'].str.contains(pattern, case=False, na=True)
                        filtered_df.loc[exact_match, 'skin_type_score'] = 3
                        filtered_df.loc[compatible_match & ~exact_match, 'skin_type_score'] = 2
                        filtered_df.loc[~compatible_match, 'skin_type_score'] = 1
                print(f"Expanded to bounded range {expand_min}-{expand_max}: {len(filtered_df)} products")

            # Compute a normalized price_score relative to the user's preferred range for use in filter scoring
            if len(filtered_df) > 0:
                pref_mid = (min_price + max_price) / 2.0
                pref_half = max((max_price - min_price) / 2.0, 1.0)
                def _price_score_row(p: float) -> float:
                    if pd.isna(p):
                        return 0.0
                    rel = max(0.0, 1.0 - abs(p - pref_mid) / pref_half)  # 0..1 (1 if at mid)
                    return round(rel * 3.0, 3)  # scale to 0..3 similar to other scores
                filtered_df['price_score'] = filtered_df['price'].apply(_price_score_row)

        # Skin Concerns Scoring (not filtering)
        skin_concerns = preferences.get('skin_concerns', [])
        if skin_concerns:
            print(f"Scoring by concerns: {skin_concerns}")
            benefit_patterns = {
                'Brightening': ['brighten', 'bright', 'glow', 'radiant', 'luminous', 'vitamin c', 'vitamin-c'],
                'Anti-aging': ['anti.?age', 'anti.?aging', 'wrinkle', 'fine.?line', 'collagen', 'retinol', 'peptide'],
                'Moisturizing': ['moistur', 'hydrat', 'nourish', 'dry.?skin', 'hyaluronic'],
                'Acne': ['acne', 'pimple', 'blemish', 'blackhead', 'salicylic', 'benzoyl', 'tea tree'],
                'Sun Protection': ['spf', 'sun.?protection', 'uv', 'sunscreen'],
                'Exfoliating': ['exfoliat', 'scrub', 'aha', 'bha', 'glycolic', 'lactic'],
                'Dark Spots': ['dark.?spot', 'hyperpigment', 'melasma', 'brighten', 'even.?tone'],
                'Oily T-Zone': ['oil.?control', 'sebum', 'mattif', 'pore', 'combination'],
                'Dryness': ['moistur', 'hydrat', 'dry', 'barrier', 'ceramide'],
                'Fine Lines': ['fine.?line', 'wrinkle', 'anti.?age', 'retinol', 'collagen'],
                'Large Pores': ['pore', 'niacinamide', 'bha', 'salicylic'],
                'Uneven Skin Tone': ['even.?tone', 'brighten', 'vitamin c', 'niacinamide']
            }
            
            for concern in skin_concerns:
                if concern in benefit_patterns:
                    pattern = '|'.join(benefit_patterns[concern])
                    concern_match = (
                        filtered_df['product_benefits'].str.contains(pattern, case=False, na=False) |
                        filtered_df['about_item'].str.contains(pattern, case=False, na=False) |
                        filtered_df['content'].str.contains(pattern, case=False, na=False)
                    )
                    filtered_df.loc[concern_match, 'concern_score'] += 2
                else:
                    # Generic search for unlisted concerns
                    concern_pattern = concern.lower().replace(' ', '.?')
                    generic_match = filtered_df['content'].str.contains(concern_pattern, case=False, na=False)
                    filtered_df.loc[generic_match, 'concern_score'] += 1

        # Ingredient Scoring (prefer products with desired ingredients - ANY match is good)
        ingredients = preferences.get('ingredients', [])
        if ingredients:
            print(f"Scoring by preferred ingredients: {ingredients}")
            # Give bonus points for each ingredient found (flexible matching)
            for ingredient in ingredients:
                ingredient_match = filtered_df['content'].str.contains(ingredient, case=False, na=False)
                filtered_df.loc[ingredient_match, 'ingredient_score'] += 3  # Increased from 2 to 3
                print(f"  Found {ingredient_match.sum()} products with {ingredient}")

        # Avoid Ingredient Filtering (HARD filter - remove products with ANY avoided ingredient)
        avoid_ingredients = preferences.get('avoid_ingredients', [])
        if avoid_ingredients:
            print(f"Hard filtering avoided ingredients: {avoid_ingredients}")
            before_count = len(filtered_df)
            for ingredient in avoid_ingredients:
                avoid_match = filtered_df['content'].str.contains(ingredient, case=False, na=False)
                filtered_df = filtered_df[~avoid_match]  # Remove products with this ingredient
                print(f"  Removed {avoid_match.sum()} products containing {ingredient}")
            print(f"After avoid ingredients filter: {len(filtered_df)} products (was {before_count})")
            
            # If too few products after avoid filter, warn but continue
            if len(filtered_df) < 5:
                print("⚠️ Very few products left after avoiding ingredients. Consider relaxing restrictions.")
                # Don't expand here - let the user know their restrictions are too tight

        # Calculate total score and keep top products
        filtered_df['total_filter_score'] = (
            filtered_df['skin_type_score'] + 
            filtered_df['concern_score'] + 
            filtered_df['ingredient_score'] +
            filtered_df.get('price_score', 0)
        )
        
        # Sort by total score and keep reasonable number of products
        filtered_df = filtered_df.sort_values('total_filter_score', ascending=False)
        
        # Keep at least 75 products for recommendation scoring, or all if less than 75
        min_products = min(75, len(filtered_df))
        filtered_df = filtered_df.head(min_products)
        
        print(f"After intelligent filtering: {len(filtered_df)} products")
        print(f"Score distribution - Max: {filtered_df['total_filter_score'].max()}, Min: {filtered_df['total_filter_score'].min()}")

        return filtered_df

    def _truncate_text(self, text, max_length):
        """Truncate text to specified length"""
        if pd.isna(text) or text == '':
            return 'No description available'
        text = str(text)
        if len(text) > max_length:
            return text[:max_length] + '...'
        return text

    def generate_skincare_routine(self, preferences, acne_detected=False, image_insights=None):
        """Generate a comprehensive personalized skincare routine using enhanced Gemini AI with product integration."""
        try:
            recommendations = self.recommend(preferences, num_recommendations=20)
            print(f"Got {len(recommendations)} product recommendations for routine generation")
            
            # Debug: Print product names and descriptions to see what we're working with
            print("Available products for routine:")
            for i, product in enumerate(recommendations[:10]):  # Show first 10
                print(f"  {i+1}. {product['name'][:50]}...")
                print(f"     Description: {product['description'][:80]}...")
            
            # Use enhanced Gemini AI if available
            if self.gemini_ai:
                print("Using enhanced Gemini AI for routine generation...")
                user_profile = {
                    'skinType': preferences.get('skin_type', 'Unknown'),
                    'ageRange': preferences.get('age_group', 'Unknown'),
                    'concerns': preferences.get('skin_concerns', []),
                    'preferredIngredients': preferences.get('ingredients', []),
                    'avoidIngredients': preferences.get('avoid_ingredients', []),
                    'budget': preferences.get('price_range', 'Unknown')
                }
                
                # Log enhanced routine generation request
                self._log_ai_interaction(
                    interaction_type="routine_generation_request",
                    query="Requesting enhanced AI routine generation",
                    user_profile=user_profile,
                    metadata={
                        "acne_detected": acne_detected,
                        "recommendations_count": len(recommendations),
                        "has_image_insights": bool(image_insights),
                        "image_analysis_quality": image_insights.get('analysis_quality', 'none') if image_insights else 'none',
                        "available_products": [rec.get("name", "Unknown") for rec in recommendations[:10]]
                    }
                )
                
                try:
                    # Use enhanced routine generation with image insights
                    ai_routine = self.gemini_ai.generate_skincare_routine(
                        user_profile, 
                        recommendations, 
                        acne_detected,
                        image_insights
                    )
                    
                    # Check if AI routine has content
                    if (ai_routine.get('morning') or ai_routine.get('evening')):
                        # Log successful routine generation
                        self._log_ai_interaction(
                            interaction_type="routine_generation_success",
                            query="Enhanced AI routine generation completed",
                            response={
                                "morning_steps": len(ai_routine.get('morning', [])),
                                "evening_steps": len(ai_routine.get('evening', [])),
                                "weekly_steps": len(ai_routine.get('weekly', [])),
                                "routine_type": "enhanced_with_image_insights" if image_insights else "profile_based",
                                "product_integration_success": sum(1 for step in (ai_routine.get('morning', []) + ai_routine.get('evening', [])) if step.get('product')),
                                "routine_preview": {
                                    "morning": [step.get("step", "Unknown") for step in ai_routine.get('morning', [])[:3]],
                                    "evening": [step.get("step", "Unknown") for step in ai_routine.get('evening', [])[:3]]
                                }
                            },
                            user_profile=user_profile
                        )
                        
                        print(f"AI routine generated successfully: {len(ai_routine.get('morning', []))} morning steps, {len(ai_routine.get('evening', []))} evening steps")
                        return ai_routine
                    else:
                        # Log empty routine
                        self._log_ai_interaction(
                            interaction_type="routine_generation_empty",
                            query="AI routine generation returned empty",
                            response=ai_routine,
                            user_profile=user_profile
                        )
                        print("AI routine was empty, falling back to rule-based")
                        
                except Exception as routine_error:
                    # Log routine generation error
                    self._log_ai_interaction(
                        interaction_type="routine_generation_error",
                        query="AI routine generation failed",
                        error=routine_error,
                        user_profile=user_profile,
                        metadata={"acne_detected": acne_detected}
                    )
                    print(f"AI routine generation failed: {routine_error}")
            
            # Fallback to rule-based routine generation
            print("Using rule-based routine generation...")
            return self._generate_rule_based_routine(recommendations, acne_detected)
            
        except Exception as e:
            print(f"Error generating routine: {e}")
            return self._generate_rule_based_routine([], acne_detected)

    def generate_skin_analysis(self, user_profile, acne_detections=None, image_insights=None):
        """Generate comprehensive skin analysis using enhanced Gemini AI with image insights."""
        try:
            if self.gemini_ai:
                print("Using enhanced Gemini AI for detailed skin analysis...")
                
                # Log skin analysis request with image insights
                self._log_ai_interaction(
                    interaction_type="skin_analysis_request",
                    query="Requesting enhanced AI skin analysis",
                    user_profile=user_profile,
                    metadata={
                        "has_acne_detections": bool(acne_detections),
                        "acne_detections_count": len(acne_detections) if acne_detections else 0,
                        "has_image_insights": bool(image_insights),
                        "image_analysis_quality": image_insights.get('analysis_quality', 'none') if image_insights else 'none'
                    }
                )
                
                try:
                    # Use enhanced skin analysis with image insights
                    analysis_result = self.gemini_ai.generate_skin_analysis(
                        user_profile, 
                        acne_detections, 
                        image_insights
                    )
                    
                    # Log successful analysis
                    self._log_ai_interaction(
                        interaction_type="skin_analysis_success",
                        query="Enhanced AI skin analysis completed",
                        response={
                            "analysis_length": len(str(analysis_result)) if analysis_result else 0,
                            "analysis_preview": str(analysis_result)[:200] + "..." if len(str(analysis_result)) > 200 else str(analysis_result),
                            "analysis_type": "enhanced_with_image_insights" if image_insights else "profile_based"
                        },
                        user_profile=user_profile
                    )
                    
                    return analysis_result
                    
                except Exception as analysis_error:
                    # Log analysis error
                    self._log_ai_interaction(
                        interaction_type="skin_analysis_error",
                        query="Enhanced AI skin analysis failed",
                        error=analysis_error,
                        user_profile=user_profile
                    )
                    print(f"Enhanced AI skin analysis failed: {analysis_error}")
                    return self._generate_fallback_analysis(user_profile, acne_detections)
            else:
                print("Using fallback skin analysis...")
                return self._generate_fallback_analysis(user_profile, acne_detections)
        except Exception as e:
            # Log general error
            self._log_ai_interaction(
                interaction_type="skin_analysis_general_error",
                query="Skin analysis process failed",
                error=e,
                user_profile=user_profile
            )
            print(f"Error generating enhanced skin analysis: {e}")
            return self._generate_fallback_analysis(user_profile, acne_detections)

    def _generate_rule_based_routine(self, recommendations, acne_detected=False):
        """Generate routine using the original rule-based approach."""
        try:
            # Categorize products by type with more comprehensive keywords
            routine_categories = {
                'cleanser': ['cleanser', 'face wash', 'cleansing', 'foam', 'gel cleanser', 'cleansing gel'],
                'moisturizer': ['moisturizer', 'moisturiser', 'cream', 'lotion', 'hydrating', 'hydration', 'face cream', 'day cream', 'night cream', 'moisturizing', 'moisture'],
                'serum': ['serum', 'essence', 'treatment', 'concentrate', 'ampoule'],
                'sunscreen': ['sunscreen', 'spf', 'sun protection', 'sunblock', 'sun cream', 'uv protection', 'broad spectrum'],
                'toner': ['toner', 'astringent', 'refresher', 'mist', 'essence'],
                'exfoliator': ['exfoliat', 'scrub', 'peel', 'aha', 'bha', 'glycolic', 'salicylic'],
                'mask': ['mask', 'pack', 'sheet mask', 'clay mask']
            }
            
            routine = {}
            used_products = set()
            
            # Build routine step by step with better product matching
            for category, keywords in routine_categories.items():
                category_products = []
                for product in recommendations:
                    if product['name'] not in used_products:
                        product_name_lower = product['name'].lower()
                        product_desc_lower = product['description'].lower()
                        product_ingredients_lower = str(product.get('ingredients', '')).lower()
                        product_suitable_lower = str(product.get('suitableFor', '')).lower()
                        
                        # Combine all text for better matching
                        combined_text = f"{product_name_lower} {product_desc_lower} {product_ingredients_lower} {product_suitable_lower}"
                        
                        # Check if any keyword matches in the combined text
                        if any(keyword in combined_text for keyword in keywords):
                            category_products.append(product)
                            used_products.add(product['name'])
                            print(f"Found {category}: {product['name']}")
                            break  # Take only one product per category
                
                if category_products:
                    routine[category] = category_products[0]
                else:
                    print(f"No product found for category: {category}")
            
            print(f"Routine products found: {list(routine.keys())}")
            
            # Ensure we have essential products - try harder to find moisturizer and sunscreen
            essential_categories = ['moisturizer', 'sunscreen']
            for essential_cat in essential_categories:
                if essential_cat not in routine:
                    print(f"Trying harder to find {essential_cat}...")
                    # Try with looser keywords
                    loose_keywords = {
                        'moisturizer': ['cream', 'lotion', 'hydrat', 'moisture', 'moistur'],
                        'sunscreen': ['spf', 'sun', 'uv', 'protect']
                    }
                    
                    for product in recommendations:
                        if product['name'] not in used_products:
                            combined_text = f"{product['name'].lower()} {product['description'].lower()} {str(product.get('ingredients', '')).lower()}"
                            
                            if any(keyword in combined_text for keyword in loose_keywords.get(essential_cat, [])):
                                routine[essential_cat] = product
                                used_products.add(product['name'])
                                print(f"Found {essential_cat} with loose matching: {product['name']}")
                                break
            
            # Special handling for acne-detected users
            if acne_detected:
                acne_keywords = ['acne', 'salicylic', 'benzoyl peroxide', 'tea tree', 'bha']
                acne_products = []
                for product in recommendations:
                    if product['name'] not in used_products:
                        content = (product['name'] + ' ' + product['description'] + ' ' + str(product['ingredients'])).lower()
                        if any(keyword in content for keyword in acne_keywords):
                            acne_products.append(product)
                            break
                
                if acne_products:
                    routine['acne_treatment'] = acne_products[0]
            
            # Format routine steps with actual product names and details
            routine_steps = {
                'morning': [
                    {
                        'step': 'Cleanser', 
                        'product': routine.get('cleanser'),
                        'instruction': f"Use {routine.get('cleanser', {}).get('name', 'a gentle cleanser')} to gently cleanse your face and remove impurities accumulated overnight. Massage for 1 minute." if routine.get('cleanser') else 'Gently cleanse your face to remove impurities'
                    },
                    {
                        'step': 'Toner', 
                        'product': routine.get('toner'),
                        'instruction': f"Apply {routine.get('toner', {}).get('name', 'a balancing toner')} to balance skin pH and prepare your skin for the next steps." if routine.get('toner') else 'Apply toner to balance skin pH'
                    },
                    {
                        'step': 'Serum', 
                        'product': routine.get('serum'),
                        'instruction': f"Apply {routine.get('serum', {}).get('name', 'a targeted serum')} for targeted treatment of your skin concerns. Pat gently until absorbed." if routine.get('serum') else 'Apply serum for targeted treatment'
                    },
                    {
                        'step': 'Moisturizer', 
                        'product': routine.get('moisturizer'),
                        'instruction': f"Use {routine.get('moisturizer', {}).get('name', 'a suitable moisturizer')} to hydrate your skin and lock in previous products. Apply evenly to face and neck." if routine.get('moisturizer') else 'Hydrate your skin with a suitable moisturizer'
                    },
                    {
                        'step': 'Sunscreen', 
                        'product': routine.get('sunscreen'),
                        'instruction': f"Apply {routine.get('sunscreen', {}).get('name', 'a broad-spectrum SPF 30+ sunscreen')} generously to protect your skin from sun damage and prevent hyperpigmentation. Reapply every 2 hours." if routine.get('sunscreen') else 'Protect your skin with SPF 30+ sunscreen'
                    }
                ],
                'evening': [
                    {
                        'step': 'Cleanser', 
                        'product': routine.get('cleanser'),
                        'instruction': f"Use {routine.get('cleanser', {}).get('name', 'a gentle cleanser')} to remove makeup, dirt, and oil accumulated during the day. Double cleanse if wearing makeup." if routine.get('cleanser') else 'Remove makeup and impurities'
                    },
                    {
                        'step': 'Toner', 
                        'product': routine.get('toner'),
                        'instruction': f"Apply {routine.get('toner', {}).get('name', 'a balancing toner')} to prepare your skin for evening treatments." if routine.get('toner') else 'Apply toner to prepare skin'
                    },
                    {
                        'step': 'Serum', 
                        'product': routine.get('serum'),
                        'instruction': f"Apply {routine.get('serum', {}).get('name', 'an evening serum')} for overnight repair and treatment of your skin concerns." if routine.get('serum') else 'Apply evening serum or treatment'
                    },
                    {
                        'step': 'Moisturizer', 
                        'product': routine.get('moisturizer'),
                        'instruction': f"Use {routine.get('moisturizer', {}).get('name', 'a nourishing moisturizer')} to provide deep hydration and support overnight skin repair. Apply generously." if routine.get('moisturizer') else 'Apply a heavier night moisturizer for deep hydration'
                    }
                ] + ([{
                    'step': 'Acne Treatment', 
                    'product': routine.get('acne_treatment'),
                    'instruction': f"Apply {routine.get('acne_treatment', {}).get('name', 'acne treatment')} to target breakouts and prevent future blemishes. Use as directed."
                }] if routine.get('acne_treatment') and acne_detected else []),
                'weekly': [
                    routine.get('exfoliator') and {
                        'step': 'Exfoliator', 
                        'product': routine.get('exfoliator'),
                        'instruction': f"Use {routine.get('exfoliator', {}).get('name', 'an exfoliating product')} 2-3 times per week to remove dead skin cells and improve skin texture."
                    },
                    routine.get('mask') and {
                        'step': 'Face Mask', 
                        'product': routine.get('mask'),
                        'instruction': f"Apply {routine.get('mask', {}).get('name', 'a treatment mask')} 1-2 times per week for deep treatment and nourishment."
                    }
                ]
            }
            
            # Remove None entries and invalid entries
            for period in routine_steps:
                routine_steps[period] = [step for step in routine_steps[period] if step and isinstance(step, dict)]
            for period in routine_steps:
                routine_steps[period] = [step for step in routine_steps[period] if step is not None]
            
            return routine_steps
            
        except Exception as e:
            print(f"Error generating rule-based routine: {e}")
            return {
                'morning': [],
                'evening': [],
                'weekly': []
            }

    def _generate_fallback_analysis(self, user_profile, acne_detections=None):
        """Generate fallback skin analysis when AI is unavailable."""
        skin_type = user_profile.get('skinType', 'Unknown')
        concerns = user_profile.get('concerns', [])
        age_range = user_profile.get('ageRange', 'Unknown')

        analysis = f"Based on your {skin_type.lower()} skin type and {age_range} age range, "
        
        if concerns:
            analysis += f"your main concerns of {', '.join(concerns)} suggest you need "
        
        if skin_type.lower() == 'oily':
            analysis += "products that control sebum production while maintaining hydration. "
        elif skin_type.lower() == 'dry':
            analysis += "intensive moisturizing and barrier repair products. "
        elif skin_type.lower() == 'sensitive':
            analysis += "gentle, fragrance-free products with minimal ingredients. "
        elif skin_type.lower() == 'combination':
            analysis += "a balanced approach with different products for different facial zones. "

        if acne_detections:
            analysis += "Our analysis detected acne-prone areas that would benefit from targeted treatments. "

        analysis += "The recommended products have been selected to address your specific needs while being gentle on your skin."

        return analysis

    def _log_ai_interaction(self, interaction_type, query, response=None, error=None, user_profile=None, metadata=None):
        """Log AI interactions to JSON file for debugging"""
        try:
            log_entry = {
                "timestamp": datetime.datetime.now().isoformat(),
                "interaction_type": interaction_type,
                "user_profile": user_profile,
                "query": query,
                "response": response,
                "error": str(error) if error else None,
                "error_traceback": traceback.format_exc() if error else None,
                "metadata": metadata or {}
            }
            
            # Create logs directory if it doesn't exist
            import os
            logs_dir = "logs"
            if not os.path.exists(logs_dir):
                os.makedirs(logs_dir)
            
            # Generate filename with date
            date_str = datetime.datetime.now().strftime("%Y%m%d")
            log_file = os.path.join(logs_dir, f"gemini_ai_interactions_{date_str}.json")
            
            # Read existing logs or create new list
            existing_logs = []
            if os.path.exists(log_file):
                try:
                    with open(log_file, 'r', encoding='utf-8') as f:
                        existing_logs = json.load(f)
                except Exception:
                    existing_logs = []
            
            # Append new log entry
            existing_logs.append(log_entry)
            
            # Keep only last 100 entries to prevent file from getting too large
            if len(existing_logs) > 100:
                existing_logs = existing_logs[-100:]
            
            # Write back to file
            with open(log_file, 'w', encoding='utf-8') as f:
                json.dump(existing_logs, f, indent=2, ensure_ascii=False)
            
            print(f"📝 AI interaction logged to {log_file}")
            
        except Exception as log_error:
            print(f"Failed to log AI interaction: {log_error}")

    def analyze_skin_image_and_generate_insights(self, image_data: bytes, user_profile: Dict) -> Dict:
        """Analyze uploaded skin image and generate comprehensive insights for personalization."""
        try:
            if self.gemini_ai:
                print("Analyzing uploaded skin image for enhanced personalization...")
                
                # Log image analysis request
                self._log_ai_interaction(
                    interaction_type="image_analysis_request",
                    query="Requesting comprehensive image analysis",
                    user_profile=user_profile,
                    metadata={
                        "image_size": len(image_data),
                        "analysis_type": "comprehensive_vision_analysis"
                    }
                )
                
                try:
                    # Get detailed image analysis
                    image_analysis = self.gemini_ai.analyze_skin_image(image_data, user_profile)
                    
                    # Log successful image analysis
                    self._log_ai_interaction(
                        interaction_type="image_analysis_success",
                        query="Image analysis completed successfully",
                        response={
                            "analysis_type": image_analysis.get('analysis_quality', 'unknown'),
                            "has_structured_insights": bool(image_analysis.get('structured_insights')),
                            "full_analysis_length": len(image_analysis.get('full_analysis', '')),
                            "key_insights": list(image_analysis.get('structured_insights', {}).keys())
                        },
                        user_profile=user_profile
                    )
                    
                    return image_analysis
                    
                except Exception as analysis_error:
                    # Log image analysis error
                    self._log_ai_interaction(
                        interaction_type="image_analysis_error",
                        query="Image analysis failed",
                        error=analysis_error,
                        user_profile=user_profile
                    )
                    print(f"Image analysis failed: {analysis_error}")
                    return None
                    
            else:
                print("Gemini AI not available for image analysis")
                return None
                
        except Exception as e:
            # Log general error
            self._log_ai_interaction(
                interaction_type="image_analysis_general_error",
                query="Image analysis process failed",
                error=e,
                user_profile=user_profile
            )
            print(f"Error analyzing skin image: {e}")
            return None

    def generate_complete_skin_assessment(self, user_profile: Dict, acne_detections=None, image_data: bytes = None):
        """Generate complete skin assessment with image analysis, recommendations, and routine."""
        try:
            print("Starting complete skin assessment with enhanced personalization...")
            
            # Step 1: Analyze image if provided
            image_insights = None
            if image_data and self.gemini_ai:
                image_insights = self.analyze_skin_image_and_generate_insights(image_data, user_profile)
                print(f"Image analysis completed: {image_insights.get('analysis_quality', 'none') if image_insights else 'failed'}")
            
            # Step 2: Generate enhanced skin analysis
            preferences = {
                'skin_type': user_profile.get('skinType', 'Unknown'),
                'age_group': user_profile.get('ageRange', 'Unknown'),
                'skin_concerns': user_profile.get('concerns', []),
                'ingredients': user_profile.get('preferredIngredients', []),
                'avoid_ingredients': user_profile.get('avoidIngredients', []),
                'price_range': user_profile.get('budget', 'Unknown')
            }
            
            skin_analysis = self.generate_skin_analysis(
                user_profile, 
                acne_detections, 
                image_insights
            )
            
            # Step 3: Generate product recommendations with enhanced context
            recommendations = self.recommend(preferences, num_recommendations=15)
            
            # Step 4: Generate personalized routine with image insights
            routine = self.generate_skincare_routine(
                preferences, 
                bool(acne_detections), 
                image_insights
            )
            
            # Compile complete assessment
            complete_assessment = {
                'skin_analysis': skin_analysis,
                'image_insights': image_insights,
                'product_recommendations': recommendations,
                'skincare_routine': routine,
                'assessment_metadata': {
                    'has_image_analysis': bool(image_insights),
                    'has_acne_detection': bool(acne_detections),
                    'recommendations_count': len(recommendations),
                    'routine_completeness': {
                        'morning_steps': len(routine.get('morning', [])),
                        'evening_steps': len(routine.get('evening', [])),
                        'weekly_steps': len(routine.get('weekly', []))
                    }
                }
            }
            
            print("Complete skin assessment generated successfully")
            return complete_assessment
            
        except Exception as e:
            print(f"Error generating complete skin assessment: {e}")
            # Return fallback assessment
            return {
                'skin_analysis': self._generate_fallback_analysis(user_profile, acne_detections),
                'image_insights': None,
                'product_recommendations': [],
                'skincare_routine': self._generate_rule_based_routine([], bool(acne_detections)),
                'assessment_metadata': {
                    'has_image_analysis': False,
                    'has_acne_detection': bool(acne_detections),
                    'recommendations_count': 0,
                    'fallback_mode': True
                }
            }

    # ...existing code...

# Backwards compatibility - keep the old class name as an alias
ProductRecommender = ProductRecommenderSupabase
