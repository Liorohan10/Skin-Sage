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
        df = self._smart_filter_products(self.df, preferences)
        print(f"Filtered dataframe has {len(df)} products")  # Debug log
        
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
            
        scores = []
        for idx, product in df.iterrows():
            score = 0
            if pd.notna(product['Rating']):
                score += (product['Rating'] / 5.0) * 0.4
            if pd.notna(product['Price']):
                max_price = df['Price'].max()
                min_price = df['Price'].min()
                if max_price > min_price:
                    price_score = 1 - ((product['Price'] - min_price) / (max_price - min_price))
                    score += price_score * 0.2
            score += 0.2  # Base content score
            scores.append(score)
        df = df.copy()
        df['recommendation_score'] = scores
        recommendations = df.nlargest(num_recommendations, 'recommendation_score')
        
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

        # Price Range Filtering
        price_range = preferences.get('price_range')
        if price_range:
            min_price, max_price = price_range
            print(f"Filtering by price range: {min_price} - {max_price}")  # Debug log
            filtered_df = filtered_df[(filtered_df['Price'] >= min_price) & (filtered_df['Price'] <= max_price) & (filtered_df['Price'].notna())]
            print(f"After price filter: {len(filtered_df)} products")  # Debug log

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
