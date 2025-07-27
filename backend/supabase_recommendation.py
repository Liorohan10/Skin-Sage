import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from supabase import create_client, Client
import os
from typing import List, Dict, Optional

class SupabaseProductRecommender:
    def __init__(self, supabase_url: str = None, supabase_key: str = None):
        """Initialize the recommender with Supabase connection."""
        self.supabase_url = supabase_url or os.getenv('SUPABASE_URL')
        self.supabase_key = supabase_key or os.getenv('SUPABASE_ANON_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Supabase URL and key must be provided either as parameters or environment variables")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        self.df = None
        self.tfidf = None
        self.tfidf_matrix = None
        self.cosine_sim = None
        
        # Load and prepare data on initialization
        self._load_data_from_supabase()
        self._build_recommendation_system()

    def _load_data_from_supabase(self):
        """Load product data from Supabase."""
        try:
            print("Loading products from Supabase...")
            response = self.supabase.table('products').select('*').execute()
            
            if not response.data:
                raise ValueError("No products found in Supabase database")
            
            # Convert to DataFrame
            self.df = pd.DataFrame(response.data)
            print(f"Loaded {len(self.df)} products from Supabase")
            
            # Prepare data similar to CSV version
            self._prepare_data()
            
        except Exception as e:
            print(f"Error loading data from Supabase: {str(e)}")
            raise

    def _prepare_data(self):
        """Clean and prepare the data for recommendations."""
        # Handle missing values
        self.df['brand'] = self.df['brand'].fillna('Unknown Brand')
        self.df['skin_type'] = self.df['skin_type'].fillna('All')
        self.df['product_benefits'] = self.df['product_benefits'].fillna('')
        self.df['about_item'] = self.df['about_item'].fillna('')
        self.df['active_ingredients'] = self.df['active_ingredients'].fillna('')
        
        # Create content field for similarity matching
        content_fields = ['product_name', 'brand', 'product_benefits', 'active_ingredients', 'about_item', 'skin_type']
        self.df['content'] = self.df[content_fields].fillna('').astype(str).apply(lambda x: ' '.join(x), axis=1)
        
        # Create price categories
        self.df['price_category'] = pd.cut(
            self.df['price'], 
            bins=[0, 300, 600, 1000, float('inf')], 
            labels=['Budget', 'Mid-range', 'Premium', 'Luxury']
        )
        
        # Create rating categories
        self.df['rating_category'] = pd.cut(
            self.df['rating'], 
            bins=[0, 3.0, 4.0, 4.5, 5.0], 
            labels=['Below Average', 'Good', 'Very Good', 'Excellent']
        )

    def _build_recommendation_system(self):
        """Build the TF-IDF recommendation system."""
        if self.df is None or self.df.empty:
            raise ValueError("No data available to build recommendation system")
        
        print("Building recommendation system...")
        self.tfidf = TfidfVectorizer(
            max_features=8000, 
            stop_words='english', 
            ngram_range=(1, 3), 
            min_df=2, 
            max_df=0.9
        )
        
        self.tfidf_matrix = self.tfidf.fit_transform(self.df['content'])
        self.cosine_sim = cosine_similarity(self.tfidf_matrix)
        print("Recommendation system built successfully")

    def get_products_by_filters(self, filters: Dict) -> pd.DataFrame:
        """Get products from Supabase with specific filters."""
        try:
            query = self.supabase.table('products').select('*')
            
            # Apply filters
            if filters.get('skin_type'):
                skin_type = filters['skin_type'].lower()
                # Use ilike for case-insensitive partial matching
                query = query.ilike('skin_type', f'%{skin_type}%')
            
            if filters.get('price_min') is not None and filters.get('price_max') is not None:
                query = query.gte('price', filters['price_min']).lte('price', filters['price_max'])
            
            if filters.get('min_rating'):
                query = query.gte('rating', filters['min_rating'])
            
            if filters.get('brand'):
                query = query.ilike('brand', f'%{filters["brand"]}%')
            
            response = query.execute()
            return pd.DataFrame(response.data) if response.data else pd.DataFrame()
            
        except Exception as e:
            print(f"Error querying Supabase: {str(e)}")
            return pd.DataFrame()

    def recommend(self, preferences: Dict, num_recommendations: int = 10) -> List[Dict]:
        """Generate product recommendations based on user preferences."""
        print(f"Generating recommendations with preferences: {preferences}")
        
        # Start with filtered data
        filtered_df = self._smart_filter_products(preferences)
        
        if filtered_df.empty:
            print("No products found after filtering, using fallback")
            # Fallback to less strict filtering
            filtered_df = self._fallback_recommendations(preferences, num_recommendations)
        
        if filtered_df.empty:
            print("No products found even with fallback")
            return []
        
        # Calculate recommendation scores
        scores = self._calculate_recommendation_scores(filtered_df)
        filtered_df = filtered_df.copy()
        filtered_df['recommendation_score'] = scores
        
        # Get top recommendations
        recommendations = filtered_df.nlargest(num_recommendations, 'recommendation_score')
        
        # Format for frontend
        return self._format_recommendations(recommendations)

    def _smart_filter_products(self, preferences: Dict) -> pd.DataFrame:
        """Apply smart filtering based on user preferences."""
        filtered_df = self.df.copy()
        print(f"Starting with {len(filtered_df)} total products")
        
        # Skin type filtering
        skin_type = preferences.get('skin_type')
        if skin_type and skin_type.lower() != "any":
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
                filtered_df = filtered_df[
                    filtered_df['skin_type'].str.contains(pattern, case=False, na=True)
                ]
                print(f"After skin type filter: {len(filtered_df)} products (was {before_count})")
        
        # Price range filtering
        price_range = preferences.get('price_range')
        if price_range and len(price_range) == 2:
            min_price, max_price = price_range
            before_count = len(filtered_df)
            filtered_df = filtered_df[
                (filtered_df['price'] >= min_price) & 
                (filtered_df['price'] <= max_price) & 
                (filtered_df['price'].notna())
            ]
            print(f"After price filter: {len(filtered_df)} products (was {before_count})")
        
        # Skin concerns filtering
        skin_concerns = preferences.get('skin_concerns', [])
        if skin_concerns:
            benefit_patterns = {
                'brightening': ['brighten', 'bright', 'glow', 'radiant', 'luminous'],
                'anti-aging': ['anti.?age', 'anti.?aging', 'wrinkle', 'fine.?line', 'collagen'],
                'moisturizing': ['moistur', 'hydrat', 'nourish', 'dry.?skin'],
                'acne': ['acne', 'pimple', 'blemish', 'blackhead', 'salicylic'],
                'sun protection': ['spf', 'sun.?protection', 'uv', 'sunscreen'],
                'exfoliating': ['exfoliat', 'scrub', 'aha', 'bha', 'glycolic']
            }
            
            for concern in skin_concerns:
                concern_lower = concern.lower()
                if concern_lower in benefit_patterns:
                    pattern = '|'.join(benefit_patterns[concern_lower])
                    before_count = len(filtered_df)
                    filtered_df = filtered_df[
                        filtered_df['product_benefits'].str.contains(pattern, case=False, na=False) |
                        filtered_df['about_item'].str.contains(pattern, case=False, na=False)
                    ]
                    print(f"After {concern} filter: {len(filtered_df)} products (was {before_count})")
        
        return filtered_df

    def _fallback_recommendations(self, preferences: Dict, num_recommendations: int) -> pd.DataFrame:
        """Provide fallback recommendations when strict filtering returns no results."""
        print("Using fallback recommendation strategy...")
        
        # Try with just price filter
        price_range = preferences.get('price_range')
        if price_range and len(price_range) == 2:
            min_price, max_price = price_range
            fallback_df = self.df[
                (self.df['price'] >= min_price) & 
                (self.df['price'] <= max_price) & 
                (self.df['price'].notna())
            ]
            if not fallback_df.empty:
                print(f"Fallback with price filter: {len(fallback_df)} products")
                return fallback_df
        
        # If still empty, return top-rated products
        print("Using top-rated products as final fallback")
        return self.df.dropna(subset=['rating']).nlargest(num_recommendations, 'rating')

    def _calculate_recommendation_scores(self, df: pd.DataFrame) -> List[float]:
        """Calculate recommendation scores for filtered products."""
        scores = []
        for _, product in df.iterrows():
            score = 0
            
            # Rating score (40% weight)
            if pd.notna(product['rating']):
                score += (product['rating'] / 5.0) * 0.4
            
            # Price score (20% weight) - lower prices get higher scores
            if pd.notna(product['price']) and len(df) > 1:
                max_price = df['price'].max()
                min_price = df['price'].min()
                if max_price > min_price:
                    price_score = 1 - ((product['price'] - min_price) / (max_price - min_price))
                    score += price_score * 0.2
            
            # Base content score (40% weight)
            score += 0.4
            
            scores.append(score)
        
        return scores

    def _format_recommendations(self, recommendations: pd.DataFrame) -> List[Dict]:
        """Format recommendations for frontend consumption."""
        formatted_recommendations = []
        
        for _, product in recommendations.iterrows():
            formatted_product = {
                'name': str(product.get('product_name', 'Unknown Product')),
                'description': self._truncate_text(str(product.get('about_item', 'No description available')), 200),
                'price': f"₹{product.get('price', 0)}" if pd.notna(product.get('price')) else 'Price not available',
                'ingredients': str(product.get('active_ingredients', product.get('ingredients', 'Ingredients not listed'))),
                'suitableFor': str(product.get('skin_type', 'All skin types')),
                'brand': str(product.get('brand', 'Unknown Brand')),
                'rating': float(product.get('rating', 0)) if pd.notna(product.get('rating')) else 0,
                'matchReasons': [
                    f"Suitable for {product.get('skin_type', 'all skin types')}",
                    f"Contains {product.get('active_ingredients', 'beneficial ingredients')}",
                    f"Rated {product.get('rating', 'well')} by customers" if pd.notna(product.get('rating')) else "Quality product"
                ]
            }
            formatted_recommendations.append(formatted_product)
        
        return formatted_recommendations

    def _truncate_text(self, text: str, max_length: int) -> str:
        """Truncate text to specified length with ellipsis."""
        if len(text) <= max_length:
            return text
        return text[:max_length] + '...'

    def refresh_data(self):
        """Refresh data from Supabase and rebuild recommendation system."""
        self._load_data_from_supabase()
        self._build_recommendation_system()
        print("Data refreshed successfully")
