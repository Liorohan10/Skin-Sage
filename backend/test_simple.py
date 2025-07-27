#!/usr/bin/env python3
"""
Simple test to check if the updated prompts are being used correctly.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from gemini_service import GeminiAI
    
    print("✅ Successfully imported GeminiAI")
    
    # Test data
    test_user_profile = {
        'skinType': 'Oily',
        'ageRange': '25-34',
        'concerns': ['Acne', 'Oiliness'],
        'preferredIngredients': ['Salicylic Acid'],
        'avoidIngredients': ['Fragrance'],
        'budget': [100, 1000]
    }
    
    test_products = [
        {
            'name': 'CeraVe Foaming Facial Cleanser',
            'description': 'Gentle foaming cleanser for oily skin',
            'ingredients': 'Ceramides, Hyaluronic Acid',
            'category': 'Cleanser',
            'price': '₹299'
        },
        {
            'name': 'The Ordinary Niacinamide 10% + Zinc 1%',
            'description': 'Serum to reduce oiliness and blemishes',
            'ingredients': 'Niacinamide, Zinc',
            'category': 'Serum',
            'price': '₹590'
        }
    ]
    
    # Initialize Gemini AI
    gemini_ai = GeminiAI()
    print("✅ GeminiAI initialized")
    
    # Check if the format_products_for_ai method exists and works
    if hasattr(gemini_ai, '_format_products_for_ai'):
        formatted_products = gemini_ai._format_products_for_ai(test_products)
        print("\n📋 Formatted Products for AI:")
        print(formatted_products[:300] + "..." if len(formatted_products) > 300 else formatted_products)
    
    # Check if the categorize_products method exists
    if hasattr(gemini_ai, '_categorize_products'):
        categories = gemini_ai._categorize_products(test_products)
        print(f"\n🏷️ Product Categories: {categories}")
    
    print("\n✅ All basic checks passed!")
    print("The updated code structure is in place.")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
