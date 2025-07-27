-- SQL Schema for Supabase Products Table
-- Copy and paste this into your Supabase SQL Editor

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
