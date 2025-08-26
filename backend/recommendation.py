# Product Recommendation Logic (No Streamlit)
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os

class ProductRecommender:
    def __init__(self, csv_path=None):
        if csv_path is None:
            csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../Product Recommendation Model/amazon_beauty_products_high_quality_20250602_152900.csv'))
        self.df = self._load_and_prepare_data(csv_path)
        self.tfidf, self.tfidf_matrix, self.cosine_sim = self._build_advanced_recommendation_system(self.df)

    def _load_and_prepare_data(self, csv_path):
        df = pd.read_csv(csv_path)
        df = df.drop_duplicates(subset=['ASIN']).copy()
        df['Price'] = pd.to_numeric(df['Price'], errors='coerce')
        df['Rating'] = pd.to_numeric(df['Rating'], errors='coerce')
        df['Brand'] = df['Brand'].fillna('Unknown Brand')
        df['Skin_Type'] = df['Skin_Type'].fillna('All')
        df['Product Benefits'] = df['Product Benefits'].fillna('')
        df['About_Item'] = df['About_Item'].fillna('')
        df['Active Ingredients'] = df['Active Ingredients'].fillna('')
        content_fields = ['Product Name', 'Brand', 'Product Benefits', 'Active Ingredients', 'About_Item', 'Skin_Type']
        df['content'] = df[content_fields].fillna('').astype(str).apply(lambda x: ' '.join(x), axis=1)
        df['price_category'] = pd.cut(df['Price'], bins=[0, 300, 600, 1000, float('inf')], labels=['Budget', 'Mid-range', 'Premium', 'Luxury'])
        df['rating_category'] = pd.cut(df['Rating'], bins=[0, 3.0, 4.0, 4.5, 5.0], labels=['Below Average', 'Good', 'Very Good', 'Excellent'])
        return df

    def _build_advanced_recommendation_system(self, df):
        tfidf = TfidfVectorizer(max_features=8000, stop_words='english', ngram_range=(1, 3), min_df=2, max_df=0.9)
        tfidf_matrix = tfidf.fit_transform(df['content'])
        cosine_sim = cosine_similarity(tfidf_matrix)
        return tfidf, tfidf_matrix, cosine_sim

    def recommend(self, preferences, num_recommendations=10):
        print(f"Recommending with preferences: {preferences}")  # Debug log
        # Auto-detect max price from dataset and clamp requested range
        live_max = float(self.df['Price'].dropna().max() or 0)
        pr = preferences.get('price_range') or (0, 0)
        user_min, user_max = pr if isinstance(pr, (list, tuple)) and len(pr) == 2 else (0, 0)
        if user_max and live_max and user_max > live_max:
            user_max = live_max
        if user_min and user_min < 0:
            user_min = 0
        preferences = dict(preferences)
        preferences['price_range'] = [user_min, user_max]

        # Dynamic tier edges using live_max
        premium_lo = 4200
        premium_hi = max(premium_lo, int(live_max))
        budget_hi = 1700
        mid_lo, mid_hi = 1700, 4200

        # Tier-sensitive mixed detection using budget_tier or wide-open range
        budget_tier = preferences.get('budget_tier') or preferences.get('budgetTier')
        is_mixed_tier = (budget_tier == 'mixed')
        wide_open = user_min <= 450 and user_max >= (premium_hi - 100)

        df = self._smart_filter_products(self.df, preferences)
        print(f"Filtered dataframe has {len(df)} products")  # Debug log
        
        # If we have too few items after strict filters, relax secondary filters but keep price and skin type
        if 0 < len(df) < num_recommendations:
            print("Too few products after strict filters, relaxing secondary filters (keeping price & skin type)...")
            df = self._relaxed_filter_products(self.df, preferences)
            print(f"After relaxed filtering: {len(df)} products")

        if df.empty:
            print("No products found after filtering, trying with relaxed filters...")  # Debug log
            # Try with just price filter if no products found
            df = self.df.copy()
            price_range = preferences.get('price_range')
            if price_range:
                min_price, max_price = price_range
                df = df[(df['Price'] >= min_price) & (df['Price'] <= max_price) & (df['Price'].notna())]
                print(f"With relaxed filters: {len(df)} products")  # Debug log
            
            # If still empty, just take top products by rating
            if df.empty:
                print("Still no products, using top rated products...")  # Debug log
                df = self.df.copy()
                df = df.dropna(subset=['Rating']).nlargest(num_recommendations, 'Rating')
                print(f"Using top rated products: {len(df)} products")  # Debug log
            
        if df.empty:
            print("No products found even after fallbacks")  # Debug log
            return []
            
        # Special handling for mixed budget: either explicitly selected or detected as wide-open
        pr = preferences.get('price_range') or (0, 0)
        user_min, user_max = pr if isinstance(pr, (list, tuple)) and len(pr) == 2 else (0, 0)
        is_mixed = is_mixed_tier or wide_open

        if is_mixed:
            print("Detected mixed budget range; building a balanced mix across tiers...")
            tiers = {
                'budget': (400, budget_hi, 4),
                'mid': (mid_lo, mid_hi, 3),
                'premium': (premium_lo, premium_hi, 3),
            }
            picked_frames = []
            remaining = num_recommendations
            for name, (lo, hi, quota) in tiers.items():
                tier_prefs = dict(preferences)
                tier_prefs['price_range'] = [lo, hi]
                tier_df = self._smart_filter_products(self.df, tier_prefs)
                # If zero or too few, relax secondary filters (keep price/skin type)
                if len(tier_df) == 0 or (0 < len(tier_df) < quota):
                    tier_df = self._relaxed_filter_products(self.df, tier_prefs)
                scored = self._score_products(tier_df, tier_prefs)
                take = min(quota, len(scored))
                if take > 0:
                    picked_frames.append(scored.nlargest(take, 'recommendation_score'))
                remaining -= take
                print(f"Picked {take} from {name} tier")
            combined = pd.concat(picked_frames, ignore_index=True) if picked_frames else df.copy()
            # If we still need more, top-up from the full mixed df scored
            if remaining > 0:
                print(f"Topping up with additional products to reach {num_recommendations}...")
                scored_full = self._score_products(df, preferences)
                # Drop duplicates by ASIN if available, otherwise by Product Name
                key = 'ASIN' if 'ASIN' in combined.columns else 'Product Name'
                existing_keys = set(combined[key].astype(str).tolist()) if key in combined.columns else set()
                extras = scored_full[~scored_full[key].astype(str).isin(existing_keys)] if key in scored_full.columns else scored_full
                combined = pd.concat([combined, extras.nlargest(remaining, 'recommendation_score')], ignore_index=True)
            recommendations = combined.nlargest(num_recommendations, 'recommendation_score')
        else:
            scored = self._score_products(df, preferences)
            recommendations = scored.nlargest(num_recommendations, 'recommendation_score')
        
        # Transform the data to match frontend expectations
        formatted_recommendations = []
        for _, product in recommendations.iterrows():
            formatted_product = {
                'name': product.get('Product Name', 'Unknown Product'),
                'description': product.get('About_Item', 'No description available')[:200] + '...' if pd.notna(product.get('About_Item')) and len(str(product.get('About_Item'))) > 200 else product.get('About_Item', 'No description available'),
                'price': f"₹{product.get('Price', 0)}" if pd.notna(product.get('Price')) else 'Price not available',
                'ingredients': product.get('Active Ingredients', product.get('Ingredients', 'Ingredients not listed')),
                'suitableFor': product.get('Skin_Type', 'All skin types'),
                'brand': product.get('Brand', 'Unknown Brand'),
                'rating': product.get('Rating', 'No rating'),
                'matchReasons': [
                    f"Suitable for {product.get('Skin_Type', 'all skin types')}",
                    f"Contains {product.get('Active Ingredients', 'beneficial ingredients')}",
                    f"Rated {product.get('Rating', 'well')} by customers"
                ]
            }
            formatted_recommendations.append(formatted_product)
        
        return formatted_recommendations

    def _score_products(self, df, preferences):
        """Compute a simple hybrid score with rating + price proximity to the user's range.
        Returns a copy of df with a 'recommendation_score' column.
        """
        if df is None:
            return pd.DataFrame(columns=['recommendation_score'])
        pr = preferences.get('price_range') or (0, 0)
        user_min, user_max = pr if isinstance(pr, (list, tuple)) and len(pr) == 2 else (0, 0)
        user_mid = (user_min + user_max) / 2.0 if user_max > user_min else None
        user_half = max((user_max - user_min) / 2.0, 1.0) if user_max > user_min else None

        out = df.copy()
        # Initialize the column so it's present even if df is empty
        out['recommendation_score'] = 0.0
        if out.empty:
            return out

        scores = []
        for _, product in out.iterrows():
            score = 0.0
            # Rating contributes up to 0.4
            if pd.notna(product.get('Rating')):
                try:
                    score += (float(product['Rating']) / 5.0) * 0.4
                except Exception:
                    pass
            # Price proximity contributes up to 0.2 (centered around selected range)
            if pd.notna(product.get('Price')) and user_mid is not None:
                try:
                    rel = max(0.0, 1.0 - abs(float(product['Price']) - user_mid) / user_half)
                    score += rel * 0.2
                except Exception:
                    pass
            # Light content prior (constant) so we don't zero-out
            score += 0.2
            scores.append(score)
        out['recommendation_score'] = scores
        return out

    def _relaxed_filter_products(self, df, preferences):
        """Relax filters when too few items remain: keep skin type and price range; drop concern/ingredient strictness."""
        relaxed = df.copy()
        # Apply skin type similarly to _smart_filter_products
        skin_type = preferences.get('skin_type')
        if skin_type and skin_type != "Any":
            skin_type_lower = str(skin_type).lower()
            skin_keywords = {
                'dry': ['dry', 'all', 'normal', 'sensitive'],
                'oily': ['oily', 'all', 'combination', 'normal'],
                'sensitive': ['sensitive', 'all', 'normal', 'dry'],
                'normal': ['normal', 'all', 'sensitive'],
                'combination': ['combination', 'all', 'oily', 'normal']
            }
            if skin_type_lower in skin_keywords:
                pattern = '|'.join(skin_keywords[skin_type_lower])
                relaxed = relaxed[relaxed['Skin_Type'].str.contains(pattern, case=False, na=True)]
        # Price range hard filter
        price_range = preferences.get('price_range')
        if price_range:
            min_price, max_price = price_range
            in_range = (relaxed['Price'] >= min_price) & (relaxed['Price'] <= max_price) & (relaxed['Price'].notna())
            relaxed = relaxed[in_range]
            # Bounded expansion if still too few
            if len(relaxed) < 10:
                expand_min = max(0, int(min_price * 0.9))
                expand_max = int(max_price * 1.2)
                relaxed = df[(df['Price'].notna()) & (df['Price'] >= expand_min) & (df['Price'] <= expand_max)].copy()
        return relaxed

    def _smart_filter_products(self, df, preferences):
        print(f"Starting with {len(df)} total products")  # Debug log
        filtered_df = df.copy()

        # Skin Type Filtering
        skin_type = preferences.get('skin_type')
        if skin_type and skin_type != "Any":
            print(f"Filtering by skin type: {skin_type}")  # Debug log
            # Make skin type matching case insensitive and more flexible
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
                before_count = len(filtered_df)
                filtered_df = filtered_df[filtered_df['Skin_Type'].str.contains(pattern, case=False, na=True)]
                print(f"After skin type filter: {len(filtered_df)} products (was {before_count})")  # Debug log
                
                # If no products found with skin type filter, remove it
                if filtered_df.empty:
                    print("No products found with skin type filter, removing skin type restriction")
                    filtered_df = df.copy()  # Reset to original filter state

        # Price Range Filtering (hard filter with controlled expansion)
        price_range = preferences.get('price_range')
        if price_range:
            min_price, max_price = price_range
            print(f"Filtering by price range: {min_price} - {max_price}")  # Debug log
            in_range = (filtered_df['Price'] >= min_price) & (filtered_df['Price'] <= max_price) & (filtered_df['Price'].notna())
            before = len(filtered_df)
            filtered_df = filtered_df[in_range]
            print(f"After price filter: {len(filtered_df)} products (was {before})")  # Debug log

            if len(filtered_df) < 10:
                print("Too few products, expanding bounded range...")
                expand_min = max(0, int(min_price * 0.85))
                expand_max = int(max_price * 1.25)
                filtered_df = self.df[(self.df['Price'].notna()) & (self.df['Price'] >= expand_min) & (self.df['Price'] <= expand_max)].copy()
                print(f"Expanded to bounded range {expand_min}-{expand_max}: {len(filtered_df)} products")

        # Skin Concerns (Benefits) Filtering
        skin_concerns = preferences.get('skin_concerns', [])
        if skin_concerns:
            benefit_patterns = {
                'Brightening': ['brighten', 'bright', 'glow', 'radiant', 'luminous'],
                'Anti-aging': ['anti.?age', 'anti.?aging', 'wrinkle', 'fine.?line', 'collagen'],
                'Moisturizing': ['moistur', 'hydrat', 'nourish', 'dry.?skin'],
                'Acne': ['acne', 'pimple', 'blemish', 'blackhead', 'salicylic'],
                'Sun Protection': ['spf', 'sun.?protection', 'uv', 'sunscreen'],
                'Exfoliating': ['exfoliat', 'scrub', 'aha', 'bha', 'glycolic']
            }
            for concern in skin_concerns:
                if concern in benefit_patterns:
                    pattern = '|'.join(benefit_patterns[concern])
                    filtered_df = filtered_df[
                        filtered_df['Product Benefits'].str.contains(pattern, case=False, na=False) |
                        filtered_df['About_Item'].str.contains(pattern, case=False, na=False)
                    ]

        # Ingredient Filtering
        ingredients = preferences.get('ingredients', [])
        if ingredients:
            for ingredient in ingredients:
                filtered_df = filtered_df[filtered_df['content'].str.contains(ingredient, case=False, na=False)]

        # Avoid Ingredient Filtering
        avoid_ingredients = preferences.get('avoid_ingredients', [])
        if avoid_ingredients:
            for ingredient in avoid_ingredients:
                filtered_df = filtered_df[~filtered_df['content'].str.contains(ingredient, case=False, na=False)]

        return filtered_df

    def generate_skincare_routine(self, preferences, acne_detected=False, image_insights=None):
        """Generate a basic skincare routine based on preferences"""
        try:
            # Initialize Gemini service if available
            if not hasattr(self, 'gemini_ai'):
                try:
                    from gemini_service import GeminiAIService
                    self.gemini_ai = GeminiAIService()
                except Exception as e:
                    print(f"Gemini AI not available for routine generation: {e}")
                    self.gemini_ai = None
            
            # If Gemini is available, use it to generate the routine
            if self.gemini_ai:
                user_profile = {
                    'skinType': preferences.get('skin_type', 'Unknown'),
                    'ageRange': preferences.get('age_group', 'Unknown'),
                    'concerns': preferences.get('skin_concerns', []),
                    'preferredIngredients': preferences.get('ingredients', []),
                    'avoidIngredients': preferences.get('avoid_ingredients', []),
                    'budget': preferences.get('price_range', 'Unknown')
                }
                
                # Get some products for the routine
                recommended_products = self.recommend(preferences, num_recommendations=5)
                
                try:
                    ai_routine = self.gemini_ai.generate_skincare_routine(
                        user_profile, 
                        recommended_products, 
                        acne_detected,
                        image_insights
                    )
                    
                    if ai_routine:
                        return ai_routine
                except Exception as e:
                    print(f"Error generating AI routine: {e}")
                    # Fall through to basic routine
            
            # Fallback to basic routine structure
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
            
        except Exception as e:
            print(f"Error in generate_skincare_routine: {e}")
            return {
                "morning": [],
                "evening": [],
                "weekly": []
            }

    def generate_skin_analysis(self, user_profile, acne_detections=None, image_insights=None):
        """Generate skin analysis based on user profile"""
        try:
            # Initialize Gemini service if available
            if not hasattr(self, 'gemini_ai'):
                try:
                    from gemini_service import GeminiAIService
                    self.gemini_ai = GeminiAIService()
                except Exception as e:
                    print(f"Gemini AI not available for analysis: {e}")
                    self.gemini_ai = None
            
            # If Gemini is available, use it for analysis
            if self.gemini_ai:
                try:
                    analysis_result = self.gemini_ai.generate_skin_analysis(
                        user_profile, 
                        acne_detections=acne_detections,
                        image_insights=image_insights
                    )
                    
                    if analysis_result:
                        return analysis_result
                except Exception as e:
                    print(f"Error generating AI analysis: {e}")
                    # Fall through to basic analysis
            
            # Fallback to basic analysis
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
            
        except Exception as e:
            print(f"Error in generate_skin_analysis: {e}")
            return {
                "consultation": "Unable to generate detailed analysis at this time.",
                "recommendations": "Please consult with a dermatologist for personalized advice."
            }
