import pandas as pd
import numpy as np
import os
from supabase import create_client, Client
from typing import List, Dict
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

def create_supabase_client() -> Client:
    """Create and return a Supabase client."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and prepare the data for Supabase upload."""
    # Create a copy of the dataframe
    df_clean = df.copy()
    
    # Convert all column names to lowercase and replace spaces/special chars with underscores
    df_clean.columns = [col.lower().replace(' ', '_').replace('-', '_').replace('(', '').replace(')', '').replace('/', '_') for col in df_clean.columns]
    
    # Handle missing values for text fields first
    text_columns = ['web_scraper_order', 'asin', 'link', 'link_href', 'product_name', 'brand', 
                   'item_model_number', 'item_weight_size', 'item_dimensions', 'scent', 'colour', 
                   'age', 'skin_type', 'product_benefits', 'special_feature', 'active_ingredients', 
                   'about_item', 'ingredients', 'usage', 'safety_info', 'ingredients_not_included', 
                   'best_seller_rank', 'best_seller_rank_number', 'best_seller_rank_category', 
                   'customer_feedback', 'brand_total_recent_orders', 'brands_years_in_amazon', 
                   'product_image', 'product_image_href', 'web_scraper_start_url', 'pagination']
    
    for col in text_columns:
        if col in df_clean.columns:
            df_clean[col] = df_clean[col].fillna('').astype(str)
            # Limit text fields to reasonable lengths to avoid database limits
            if col in ['product_name', 'about_item', 'ingredients', 'usage', 'safety_info']:
                df_clean[col] = df_clean[col].str[:1000]  # Limit to 1000 chars
    
    # Handle numeric fields properly
    numeric_columns = ['price', 'rating', 'brand_rating_percentage', 'data_completeness_score']
    for col in numeric_columns:
        if col in df_clean.columns:
            # Convert to numeric, replace invalid values with 0
            df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
            # Replace NaN, infinity, and negative infinity with 0
            df_clean[col] = df_clean[col].replace([np.inf, -np.inf, np.nan], 0)
            # Ensure values are finite and within reasonable range
            df_clean[col] = df_clean[col].clip(lower=0, upper=999999)
            # Convert to Python native float to ensure JSON compliance
            df_clean[col] = df_clean[col].astype(float)
    
    # Handle boolean fields
    boolean_columns = ['has_price', 'has_rating']
    for col in boolean_columns:
        if col in df_clean.columns:
            # Convert to boolean, treating empty strings and NaN as False
            df_clean[col] = df_clean[col].fillna(False).astype(bool)
    
    # Remove any rows where critical fields are completely empty
    if 'asin' in df_clean.columns:
        df_clean = df_clean[df_clean['asin'].str.strip() != '']
    
    return df_clean

def create_table_schema() -> str:
    """Generate the SQL schema for creating the products table in Supabase."""
    schema = """
    CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        web_scraper_order TEXT,
        asin TEXT,
        link TEXT,
        link_href TEXT,
        product_name TEXT,
        brand TEXT,
        item_model_number TEXT,
        price DECIMAL(10,2),
        item_weight_size TEXT,
        item_dimensions TEXT,
        scent TEXT,
        colour TEXT,
        age TEXT,
        skin_type TEXT,
        product_benefits TEXT,
        special_feature TEXT,
        active_ingredients TEXT,
        about_item TEXT,
        ingredients TEXT,
        usage TEXT,
        safety_info TEXT,
        ingredients_not_included TEXT,
        best_seller_rank TEXT,
        best_seller_rank_number TEXT,
        best_seller_rank_category TEXT,
        rating DECIMAL(3,2),
        customer_feedback TEXT,
        brand_rating_percentage DECIMAL(5,2),
        brand_total_recent_orders TEXT,
        brands_years_in_amazon TEXT,
        product_image TEXT,
        product_image_href TEXT,
        web_scraper_start_url TEXT,
        pagination TEXT,
        data_completeness_score DECIMAL(5,2),
        has_price BOOLEAN,
        has_rating BOOLEAN,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_products_skin_type ON products(skin_type);
    CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
    CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating);
    CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
    CREATE INDEX IF NOT EXISTS idx_products_product_name ON products(product_name);
    """
    return schema

def upload_in_batches(supabase: Client, data: List[Dict], batch_size: int = 100) -> bool:
    """Upload data to Supabase in batches to avoid timeout issues."""
    total_records = len(data)
    successful_uploads = 0
    
    print(f"Uploading {total_records} records in batches of {batch_size}...")
    
    for i in range(0, total_records, batch_size):
        batch = data[i:i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (total_records + batch_size - 1) // batch_size
        
        try:
            result = supabase.table('products').insert(batch).execute()
            successful_uploads += len(batch)
            print(f"Batch {batch_num}/{total_batches} uploaded successfully ({len(batch)} records)")
        except Exception as e:
            print(f"Error uploading batch {batch_num}: {str(e)}")
            # Try uploading records one by one in this batch
            for record in batch:
                try:
                    supabase.table('products').insert(record).execute()
                    successful_uploads += 1
                except Exception as record_error:
                    print(f"Failed to upload record: {record.get('asin', 'unknown')} - {str(record_error)}")
    
    print(f"Upload complete! {successful_uploads}/{total_records} records uploaded successfully.")
    return successful_uploads == total_records

def main():
    """Main function to upload CSV data to Supabase."""
    # Path to your CSV file
    csv_path = os.path.join('..', 'Product Recommendation Model', 'amazon_beauty_products_high_quality_20250602_152900.csv')
    
    if not os.path.exists(csv_path):
        print(f"CSV file not found at: {csv_path}")
        return
    
    print("Loading CSV data...")
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} records from CSV")
    
    print("Cleaning data...")
    df_clean = clean_data(df)
    
    print("Creating Supabase client...")
    supabase = create_supabase_client()
    
    # Convert DataFrame to list of dictionaries
    data = df_clean.to_dict('records')
    
    print(f"Sample record after cleaning: {data[0] if data else 'No data'}")  # Debug info
    
    # Ask for confirmation before uploading
    response = input(f"\nReady to upload {len(data)} records to Supabase. Continue? (y/n): ")
    if response.lower() != 'y':
        print("Upload cancelled.")
        return
    
    # Upload data
    success = upload_in_batches(supabase, data, batch_size=50)
    
    if success:
        print("\n✅ All data uploaded successfully!")
        print("Your products are now available in Supabase!")
    else:
        print("\n⚠️ Some data failed to upload. Check the logs above.")

if __name__ == "__main__":
    main()
