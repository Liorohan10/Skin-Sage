import streamlit as st
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Page configuration
st.set_page_config(
    page_title="SkinSage AI - Beauty Recommendations",
    page_icon="✨",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for enhanced styling
st.markdown("""
<style>
    .main-header {
        font-size: 3.5rem;
        font-weight: bold;
        text-align: center;
        background: linear-gradient(90deg, #FF6B9D, #4ECDC4);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 1rem;
    }
    .sub-header {
        font-size: 1.8rem;
        color: #666;
        margin-bottom: 2rem;
        text-align: center;
        font-style: italic;
    }
    .product-card {
        border: 2px solid #FF6B9D;
        border-radius: 15px;
        padding: 1.5rem;
        margin: 1rem 0;
        background: linear-gradient(135deg, #FFF8F0 0%, #FFF0F5 100%);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease;
    }
    .product-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
    }
    .metric-card {
        background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%);
        padding: 1.5rem;
        border-radius: 15px;
        text-align: center;
        color: white;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .preference-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1rem;
        border-radius: 10px;
        color: white;
        margin-bottom: 1rem;
    }
    .recommendation-badge {
        background: #FF6B9D;
        color: white;
        padding: 0.3rem 0.8rem;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: bold;
        display: inline-block;
        margin: 0.2rem;
    }
    .similarity-badge {
        background: #4ECDC4;
        color: white;
        padding: 0.2rem 0.6rem;
        border-radius: 15px;
        font-size: 0.8rem;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

# Session state for user preferences
if 'user_preferences' not in st.session_state:
    st.session_state.user_preferences = {}

@st.cache_data
def load_and_prepare_data():
    """Load and prepare the Amazon beauty dataset with enhanced preprocessing"""
    try:
        df = pd.read_csv('amazon_beauty_products_high_quality_20250602_152900.csv')
        
        # Remove duplicates and clean data
        df = df.drop_duplicates(subset=['ASIN']).copy()
        df['Price'] = pd.to_numeric(df['Price'], errors='coerce')
        df['Rating'] = pd.to_numeric(df['Rating'], errors='coerce')
        
        # Enhanced data cleaning
        df['Brand'] = df['Brand'].fillna('Unknown Brand')
        df['Skin_Type'] = df['Skin_Type'].fillna('All')
        df['Product Benefits'] = df['Product Benefits'].fillna('')
        df['About_Item'] = df['About_Item'].fillna('')
        df['Active Ingredients'] = df['Active Ingredients'].fillna('')
        
        # Create enhanced content field
        content_fields = ['Product Name', 'Brand', 'Product Benefits', 'Active Ingredients', 'About_Item', 'Skin_Type']
        df['content'] = df[content_fields].fillna('').astype(str).apply(lambda x: ' '.join(x), axis=1)
        
        # Create price categories
        df['price_category'] = pd.cut(
            df['Price'], 
            bins=[0, 300, 600, 1000, float('inf')],
            labels=['Budget', 'Mid-range', 'Premium', 'Luxury']
        )
        
        # Create rating categories
        df['rating_category'] = pd.cut(
            df['Rating'],
            bins=[0, 3.0, 4.0, 4.5, 5.0],
            labels=['Below Average', 'Good', 'Very Good', 'Excellent']
        )
        
        return df
    except Exception as e:
        st.error(f"Error loading data: {e}")
        return pd.DataFrame()

@st.cache_data
def build_advanced_recommendation_system(df):
    """Build advanced recommendation system with multiple algorithms"""
    try:
        # TF-IDF for content-based filtering
        tfidf = TfidfVectorizer(
            max_features=8000,
            stop_words='english',
            ngram_range=(1, 3),
            min_df=2,
            max_df=0.9
        )
        
        tfidf_matrix = tfidf.fit_transform(df['content'])
        cosine_sim = cosine_similarity(tfidf_matrix)
        
        return tfidf, tfidf_matrix, cosine_sim
    except Exception as e:
        st.error(f"Error building recommendation system: {e}")
        return None, None, None

def smart_filter_products(df, preferences):
    """Advanced product filtering with smart recommendations"""
    filtered_df = df.copy()
    
    # Skin type intelligent matching
    skin_type = preferences.get('skin_type')
    if skin_type and skin_type != "Any":
        if skin_type == "All Skin Types":
            filtered_df = filtered_df[
                filtered_df['Skin_Type'].str.contains('All', case=False, na=False)
            ]
        else:
            # Smart matching for skin types
            skin_keywords = {
                'Dry': ['Dry', 'All', 'Normal'],
                'Oily': ['Oily', 'All', 'Combination'],
                'Sensitive': ['Sensitive', 'All', 'Normal'],
                'Normal': ['Normal', 'All'],
                'Combination': ['Combination', 'All', 'Oily']
            }
            
            if skin_type in skin_keywords:
                pattern = '|'.join(skin_keywords[skin_type])
                filtered_df = filtered_df[
                    filtered_df['Skin_Type'].str.contains(pattern, case=False, na=False)
                ]
    
    # Price range filter
    price_range = preferences.get('price_range')
    if price_range:
        min_price, max_price = price_range
        filtered_df = filtered_df[
            (filtered_df['Price'] >= min_price) & 
            (filtered_df['Price'] <= max_price) &
            (filtered_df['Price'].notna())
        ]
    
    # Rating filter
    min_rating = preferences.get('min_rating')
    if min_rating:
        filtered_df = filtered_df[
            (filtered_df['Rating'] >= min_rating) &
            (filtered_df['Rating'].notna())
        ]
    
    # Brand preference
    brand_preference = preferences.get('brand_preference')
    if brand_preference and brand_preference != "Any":
        filtered_df = filtered_df[
            filtered_df['Brand'].str.contains(brand_preference, case=False, na=False)
        ]
    
    # Benefits filter with smart matching
    benefits = preferences.get('benefits', [])
    if benefits:
        benefit_patterns = {
            'Brightening': ['brighten', 'bright', 'glow', 'radiant', 'luminous'],
            'Anti-aging': ['anti.?age', 'anti.?aging', 'wrinkle', 'fine.?line', 'collagen'],
            'Moisturizing': ['moistur', 'hydrat', 'nourish', 'dry.?skin'],
            'Acne Prevention': ['acne', 'pimple', 'blemish', 'blackhead', 'salicylic'],
            'Sun Protection': ['spf', 'sun.?protection', 'uv', 'sunscreen'],
            'Exfoliating': ['exfoliat', 'scrub', 'aha', 'bha', 'glycolic']
        }
        
        for benefit in benefits:
            if benefit in benefit_patterns:
                pattern = '|'.join(benefit_patterns[benefit])
                filtered_df = filtered_df[
                    filtered_df['Product Benefits'].str.contains(pattern, case=False, na=False) |
                    filtered_df['About_Item'].str.contains(pattern, case=False, na=False) |
                    filtered_df['content'].str.contains(pattern, case=False, na=False)
                ]
    
    return filtered_df

def get_hybrid_recommendations(df, cosine_sim, preferences, num_recommendations=10):
    """Get hybrid recommendations combining multiple factors"""
    # Start with filtered products
    filtered_df = smart_filter_products(df, preferences)
    
    if filtered_df.empty:
        return pd.DataFrame()
    
    # Calculate composite scores
    scores = []
    for idx, product in filtered_df.iterrows():
        score = 0
        
        # Rating score (40% weight)
        if pd.notna(product['Rating']):
            score += (product['Rating'] / 5.0) * 0.4
        
        # Price score (20% weight) - inverse scoring for affordability
        if pd.notna(product['Price']):
            max_price = filtered_df['Price'].max()
            min_price = filtered_df['Price'].min()
            if max_price > min_price:
                price_score = 1 - ((product['Price'] - min_price) / (max_price - min_price))
                score += price_score * 0.2
        
        # Popularity score (20% weight) - based on data completeness
        if 'data_completeness_score' in product:
            score += (product['data_completeness_score'] / 100.0) * 0.2
        
        # Content relevance (20% weight) - TF-IDF based
        if 'search_query' in preferences:
            # This would be implemented for content-based scoring
            pass
        else:
            score += 0.2  # Base content score
        
        scores.append(score)
    
    # Add scores and sort
    filtered_df = filtered_df.copy()
    filtered_df['recommendation_score'] = scores
    recommendations = filtered_df.nlargest(num_recommendations, 'recommendation_score')
    
    return recommendations

def display_advanced_product_card(product, rank=None, show_similarity=False):
    """Display an enhanced product card with rich information"""
    
    # Create main container
    with st.container():
        st.markdown('<div class="product-card">', unsafe_allow_html=True)
        
        # Header with rank
        if rank:
            st.markdown(f"<div class='recommendation-badge'>#{rank} Recommended</div>", unsafe_allow_html=True)
        
        col1, col2 = st.columns([1, 4])
        
        with col1:
            # Product image placeholder with better styling
            st.image("https://via.placeholder.com/200x200/FF6B9D/FFFFFF?text=✨", width=180)
        
        with col2:
            # Product name with truncation
            product_name = product['Product Name']
            if len(product_name) > 80:
                product_name = product_name[:77] + "..."
            st.markdown(f"### {product_name}")
            
            # Brand with styling
            st.markdown(f"🏷️ **{product['Brand']}**")
            
            # Metrics row
            col2a, col2b, col2c, col2d = st.columns(4)
            
            with col2a:
                price = f"₹{product['Price']:.0f}" if pd.notna(product['Price']) else 'N/A'
                st.metric("💰 Price", price)
            
            with col2b:
                rating = f"{product['Rating']:.1f}" if pd.notna(product['Rating']) else 'N/A'
                st.metric("⭐ Rating", rating)
            
            with col2c:
                skin_type = product['Skin_Type'] if len(str(product['Skin_Type'])) < 15 else product['Skin_Type'][:12] + "..."
                st.metric("🧴 Skin Type", skin_type)
            
            with col2d:
                if 'recommendation_score' in product:
                    score = f"{product['recommendation_score']:.2f}"
                    st.metric("🎯 Score", score)
                elif show_similarity and 'similarity_score' in product:
                    sim = f"{product['similarity_score']:.3f}"
                    st.metric("🔗 Similarity", sim)
            
            # Product benefits
            if pd.notna(product['Product Benefits']) and product['Product Benefits']:
                benefits = product['Product Benefits'][:150]
                if len(product['Product Benefits']) > 150:
                    benefits += "..."
                st.markdown(f"**✨ Benefits:** {benefits}")
            
            # Active ingredients
            if pd.notna(product['Active Ingredients']) and product['Active Ingredients']:
                ingredients = product['Active Ingredients'][:100]
                if len(product['Active Ingredients']) > 100:
                    ingredients += "..."
                st.markdown(f"**🧪 Key Ingredients:** {ingredients}")
            
            # Price and rating categories
            col_cat1, col_cat2 = st.columns(2)
            with col_cat1:
                if 'price_category' in product and pd.notna(product['price_category']):
                    st.markdown(f"<span class='similarity-badge'>{product['price_category']}</span>", unsafe_allow_html=True)
            with col_cat2:
                if 'rating_category' in product and pd.notna(product['rating_category']):
                    st.markdown(f"<span class='similarity-badge'>{product['rating_category']}</span>", unsafe_allow_html=True)
        
        st.markdown('</div>', unsafe_allow_html=True)

def create_user_preference_form():
    """Create an enhanced user preference form"""
    st.sidebar.markdown("## 🎯 Your Beauty Profile")
    
    # Personal information
    with st.sidebar.expander("👤 Personal Info", expanded=True):
        age_group = st.selectbox("Age Group", ["18-25", "26-35", "36-45", "46-55", "55+"])
        skin_concerns = st.multiselect(
            "Primary Skin Concerns",
            ["Acne", "Dark Spots", "Fine Lines", "Dryness", "Oiliness", "Sensitivity", "Dullness"]
        )
    
    # Product preferences
    with st.sidebar.expander("🧴 Product Preferences", expanded=True):
        skin_type = st.selectbox(
            "Skin Type", 
            ["Any", "All Skin Types", "Normal", "Dry", "Oily", "Combination", "Sensitive"]
        )
        
        price_range = st.slider(
            "Budget Range (INR)", 
            min_value=50, 
            max_value=5000, 
            value=(200, 1000),
            step=50
        )
        
        min_rating = st.slider("Minimum Rating", 1.0, 5.0, 3.5, 0.1)
    
    # Brand and benefits
    with st.sidebar.expander("🏷️ Brand & Benefits", expanded=False):
        # Get top brands from data
        df = load_and_prepare_data()
        top_brands = ["Any"] + df['Brand'].value_counts().head(15).index.tolist()
        brand_preference = st.selectbox("Preferred Brand", top_brands)
        
        benefits = st.multiselect(
            "Desired Benefits",
            ["Brightening", "Anti-aging", "Moisturizing", "Acne Prevention", 
             "Sun Protection", "Hydrating", "Exfoliating", "Pore Minimizing"]
        )
    
    return {
        'age_group': age_group,
        'skin_concerns': skin_concerns,
        'skin_type': skin_type,
        'price_range': price_range,
        'min_rating': min_rating,
        'brand_preference': brand_preference,
        'benefits': benefits
    }

def main():
    # Enhanced header
    st.markdown('<h1 class="main-header">✨ SkinSage AI</h1>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">Your Personal Beauty Consultant</p>', unsafe_allow_html=True)
    
    # Load data and build model
    with st.spinner("🔮 Loading AI beauty consultant..."):
        df = load_and_prepare_data()
        
    if df.empty:
        st.error("❌ Failed to load beauty products database.")
        return
    
    with st.spinner("🤖 Training recommendation engine..."):
        tfidf, tfidf_matrix, cosine_sim = build_advanced_recommendation_system(df)
    
    if cosine_sim is None:
        st.error("❌ Failed to initialize recommendation system.")
        return
    
    # Get user preferences
    preferences = create_user_preference_form()
    st.session_state.user_preferences = preferences
    
    # Main dashboard
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.markdown('<div class="metric-card"><h4>Products</h4><h2>{:,}</h2></div>'.format(len(df)), unsafe_allow_html=True)
    with col2:
        st.markdown('<div class="metric-card"><h4>Brands</h4><h2>{}</h2></div>'.format(df['Brand'].nunique()), unsafe_allow_html=True)
    with col3:
        avg_rating = df['Rating'].mean()
        st.markdown('<div class="metric-card"><h4>Avg Rating</h4><h2>{:.1f}⭐</h2></div>'.format(avg_rating), unsafe_allow_html=True)
    with col4:
        avg_price = df['Price'].mean()
        st.markdown('<div class="metric-card"><h4>Avg Price</h4><h2>₹{:.0f}</h2></div>'.format(avg_price), unsafe_allow_html=True)
    
    st.markdown("---")
    
    # Recommendation tabs
    tab1, tab2, tab3 = st.tabs(["🎯 Smart Recommendations", "🔍 Product Search", "📊 Beauty Analytics"])
    
    with tab1:
        st.markdown("## 🎯 Personalized Recommendations")
        
        # Show user preferences summary
        st.markdown("### Your Beauty Profile")
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown(f"**Skin Type:** {preferences['skin_type']}")
            st.markdown(f"**Budget:** ₹{preferences['price_range'][0]:,} - ₹{preferences['price_range'][1]:,}")
            st.markdown(f"**Min Rating:** {preferences['min_rating']}⭐")
        
        with col2:
            if preferences['benefits']:
                st.markdown(f"**Benefits:** {', '.join(preferences['benefits'])}")
            if preferences['skin_concerns']:
                st.markdown(f"**Concerns:** {', '.join(preferences['skin_concerns'])}")
            if preferences['brand_preference'] != "Any":
                st.markdown(f"**Preferred Brand:** {preferences['brand_preference']}")
        
        if st.button("🔮 Get My Recommendations", type="primary"):
            with st.spinner("Finding perfect products for you..."):
                recommendations = get_hybrid_recommendations(df, cosine_sim, preferences, 10)
            
            if recommendations.empty:
                st.warning("🤔 No products match your exact criteria. Try adjusting your preferences.")
            else:
                st.success(f"✨ Found {len(recommendations)} perfect matches for you!")
                
                for i, (_, product) in enumerate(recommendations.iterrows()):
                    display_advanced_product_card(product, rank=i+1)
                    if i < len(recommendations) - 1:
                        st.markdown("---")
    
    with tab2:
        st.markdown("## 🔍 Find Similar Products")
        
        search_query = st.text_input(
            "Search for products:", 
            placeholder="e.g., vitamin c serum, moisturizer for dry skin, lakme sunscreen",
            help="Search by product name, brand, or benefits"
        )
        
        if search_query:
            # Enhanced search
            search_results = df[
                df['Product Name'].str.contains(search_query, case=False, na=False) |
                df['Brand'].str.contains(search_query, case=False, na=False) |
                df['Product Benefits'].str.contains(search_query, case=False, na=False) |
                df['About_Item'].str.contains(search_query, case=False, na=False)
            ].head(20)
            
            if search_results.empty:
                st.warning(f"No products found for '{search_query}'. Try different keywords.")
            else:
                st.success(f"Found {len(search_results)} products")
                
                selected_product = st.selectbox(
                    "Select a product to find similar items:",
                    search_results.index,
                    format_func=lambda x: f"{search_results.loc[x, 'Product Name'][:50]}... | {search_results.loc[x, 'Brand']} | ₹{search_results.loc[x, 'Price']}"
                )
                
                if st.button("Find Similar Products"):
                    product_idx = df.index.get_loc(selected_product)
                    
                    # Get similar products
                    sim_scores = list(enumerate(cosine_sim[product_idx]))
                    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
                    
                    similar_indices = [i for i, score in sim_scores[1:9]]  # Top 8 similar
                    similar_products = df.iloc[similar_indices].copy()
                    similar_products['similarity_score'] = [score for i, score in sim_scores[1:9]]
                    
                    st.markdown("### 🔗 Similar Products")
                    st.info(f"Based on: **{df.loc[selected_product, 'Product Name']}**")
                    
                    for i, (_, product) in enumerate(similar_products.iterrows()):
                        display_advanced_product_card(product, rank=i+1, show_similarity=True)
                        if i < len(similar_products) - 1:
                            st.markdown("---")
    
    with tab3:
        st.markdown("## 📊 Beauty Market Analytics")
        
        # Market insights
        col1, col2 = st.columns(2)
        
        with col1:
            # Top brands analysis
            brand_stats = df.groupby('Brand').agg({
                'Rating': 'mean',
                'Price': 'mean',
                'ASIN': 'count'
            }).round(2)
            brand_stats.columns = ['Avg Rating', 'Avg Price', 'Product Count']
            brand_stats = brand_stats[brand_stats['Product Count'] >= 5].sort_values('Product Count', ascending=False).head(10)
            
            fig_brands = px.bar(
                x=brand_stats.index,
                y=brand_stats['Product Count'],
                title="Top Brands by Product Count",
                labels={'x': 'Brand', 'y': 'Number of Products'}
            )
            fig_brands.update_layout(height=400, xaxis_tickangle=-45)
            st.plotly_chart(fig_brands, use_container_width=True)
        
        with col2:
            # Price vs Rating analysis
            fig_scatter = px.scatter(
                df[df['Price'].notna() & df['Rating'].notna()].sample(1000),
                x='Price',
                y='Rating',
                color='price_category',
                title="Price vs Rating Analysis",
                labels={'Price': 'Price (INR)', 'Rating': 'Customer Rating'}
            )
            fig_scatter.update_layout(height=400)
            st.plotly_chart(fig_scatter, use_container_width=True)
        
        # Skin type distribution
        skin_type_dist = df['Skin_Type'].value_counts().head(8)
        fig_pie = px.pie(
            values=skin_type_dist.values,
            names=skin_type_dist.index,
            title="Product Distribution by Skin Type"
        )
        st.plotly_chart(fig_pie, use_container_width=True)
    
    # Footer
    st.markdown("---")
    st.markdown(f"""
    <div style="text-align: center; color: #666; padding: 2rem;">
        <h4>✨ SkinSage AI - Your Beauty Intelligence Platform</h4>
        <p>🤖 Powered by Machine Learning • 📊 {len(df):,} Products • 🏷️ {df['Brand'].nunique()} Brands</p>
        <p>🇮🇳 Curated for Indian Beauty Market • 💝 Personalized Recommendations</p>
        <p><small>Last updated: {datetime.now().strftime('%B %d, %Y')}</small></p>
    </div>
    """, unsafe_allow_html=True)

if __name__ == "__main__":
    main()
