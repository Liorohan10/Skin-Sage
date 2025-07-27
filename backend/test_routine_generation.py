#!/usr/bin/env python3
"""
Test script to verify routine generation is working properly with specific products.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add current directory to path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from recommendation_supabase import ProductRecommenderSupabase
    from gemini_service import GeminiAI
    
    print("✅ Successfully imported modules")
    
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
            'suitableFor': 'Oily skin',
            'price': '₹299',
            'category': 'Cleanser'
        },
        {
            'name': 'The Ordinary Niacinamide 10% + Zinc 1%',
            'description': 'Serum to reduce oiliness and blemishes',
            'ingredients': 'Niacinamide, Zinc',
            'suitableFor': 'Oily and acne-prone skin',
            'price': '₹590',
            'category': 'Serum'
        },
        {
            'name': 'Neutrogena Ultra Sheer Sunscreen SPF 50+',
            'description': 'Lightweight broad-spectrum sunscreen',
            'ingredients': 'Zinc Oxide, Titanium Dioxide',
            'suitableFor': 'All skin types',
            'price': '₹450',
            'category': 'Sunscreen'
        },
        {
            'name': 'Cetaphil Daily Oil-Free Moisturizer',
            'description': 'Lightweight moisturizer for oily skin',
            'ingredients': 'Hyaluronic Acid, Niacinamide',
            'suitableFor': 'Oily and combination skin',
            'price': '₹390',
            'category': 'Moisturizer'
        }
    ]
    
    print("\n🧪 Testing routine generation...")
    print(f"User Profile: {test_user_profile}")
    print(f"Available Products: {len(test_products)} products")
    
    # Initialize Gemini AI
    gemini_ai = GeminiAI()
    
    # Generate routine
    print("\n🔄 Generating routine with specific products...")
    routine = gemini_ai.generate_skincare_routine(
        user_profile=test_user_profile,
        recommended_products=test_products,
        acne_detected=False
    )
    
    print("\n📋 Generated Routine:")
    print("=" * 50)
    
    if routine and isinstance(routine, dict):
        # Check morning routine
        if 'morning' in routine and routine['morning']:
            print("\n🌅 MORNING ROUTINE:")
            for i, step in enumerate(routine['morning'], 1):
                if isinstance(step, dict):
                    step_name = step.get('step', f'Step {i}')
                    instruction = step.get('instruction', 'No instruction')
                    product = step.get('product')
                    
                    print(f"\n{i}. {step_name}")
                    print(f"   Instruction: {instruction[:100]}{'...' if len(instruction) > 100 else ''}")
                    
                    if product:
                        print(f"   🧴 Product: {product.get('name', 'Unknown Product')}")
                        print(f"   💰 Price: {product.get('price', 'Unknown')}")
                    else:
                        print("   ⚠️  No specific product matched")
        
        # Check evening routine
        if 'evening' in routine and routine['evening']:
            print("\n🌙 EVENING ROUTINE:")
            for i, step in enumerate(routine['evening'], 1):
                if isinstance(step, dict):
                    step_name = step.get('step', f'Step {i}')
                    instruction = step.get('instruction', 'No instruction')
                    product = step.get('product')
                    
                    print(f"\n{i}. {step_name}")
                    print(f"   Instruction: {instruction[:100]}{'...' if len(instruction) > 100 else ''}")
                    
                    if product:
                        print(f"   🧴 Product: {product.get('name', 'Unknown Product')}")
                        print(f"   💰 Price: {product.get('price', 'Unknown')}")
                    else:
                        print("   ⚠️  No specific product matched")
    else:
        print("❌ No routine generated or invalid format")
        print(f"Routine type: {type(routine)}")
        print(f"Routine content: {routine}")
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 SUMMARY:")
    
    if routine and isinstance(routine, dict):
        morning_steps = len(routine.get('morning', []))
        evening_steps = len(routine.get('evening', []))
        
        # Count steps with specific products
        morning_with_products = sum(1 for step in routine.get('morning', []) 
                                  if isinstance(step, dict) and step.get('product'))
        evening_with_products = sum(1 for step in routine.get('evening', []) 
                                  if isinstance(step, dict) and step.get('product'))
        
        print(f"• Morning Steps: {morning_steps} ({morning_with_products} with specific products)")
        print(f"• Evening Steps: {evening_steps} ({evening_with_products} with specific products)")
        
        total_with_products = morning_with_products + evening_with_products
        total_steps = morning_steps + evening_steps
        
        if total_steps > 0:
            percentage = (total_with_products / total_steps) * 100
            print(f"• Product Match Rate: {percentage:.1f}% ({total_with_products}/{total_steps})")
            
            if percentage >= 80:
                print("✅ EXCELLENT: Most steps use specific products!")
            elif percentage >= 60:
                print("⚠️  GOOD: Many steps use specific products, but could be improved")
            else:
                print("❌ NEEDS IMPROVEMENT: Too few steps use specific products")
        else:
            print("❌ NO STEPS GENERATED")
    else:
        print("❌ ROUTINE GENERATION FAILED")

except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure all required packages are installed:")
    print("pip install google-generativeai python-dotenv supabase pandas")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
