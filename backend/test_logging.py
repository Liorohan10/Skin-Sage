#!/usr/bin/env python3
"""
Test script to verify AI interaction logging functionality
"""

import sys
import os
import json

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_logging():
    """Test the AI interaction logging"""
    try:
        from recommendation_supabase import ProductRecommenderSupabase
        
        print("🧪 Testing AI Interaction Logging...")
        
        # Initialize the recommender
        recommender = ProductRecommenderSupabase()
        
        # Test with sample preferences
        test_preferences = {
            'skin_type': 'oily',
            'age_group': '25-34',
            'skin_concerns': ['acne', 'dark spots'],
            'ingredients': ['niacinamide', 'vitamin c'],
            'avoid_ingredients': ['fragrance'],
            'price_range': [500, 2000]
        }
        
        print("📊 Testing product recommendations with logging...")
        recommendations = recommender.recommend(test_preferences, num_recommendations=10, use_ai_enhancement=True)
        
        print(f"✅ Got {len(recommendations)} recommendations")
        
        # Check if log files were created
        logs_dir = "logs"
        if os.path.exists(logs_dir):
            log_files = [f for f in os.listdir(logs_dir) if f.endswith('.json')]
            print(f"📝 Created {len(log_files)} log file(s):")
            
            for log_file in log_files:
                file_path = os.path.join(logs_dir, log_file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        log_data = json.load(f)
                    print(f"  - {log_file}: {len(log_data)} entries")
                    
                    # Show sample log entries
                    if log_data:
                        latest_entry = log_data[-1]
                        print(f"    Latest: {latest_entry.get('interaction_type', 'Unknown')} at {latest_entry.get('timestamp', 'Unknown time')}")
                        
                except Exception as e:
                    print(f"  - {log_file}: Error reading ({e})")
        else:
            print("⚠️ No logs directory found")
        
        # Test routine generation
        print("\n🔧 Testing routine generation with logging...")
        routine = recommender.generate_skincare_routine(test_preferences, acne_detected=False)
        print(f"✅ Generated routine with {len(routine.get('morning', []))} morning steps")
        
        # Test skin analysis
        print("\n🔍 Testing skin analysis with logging...")
        user_profile = {
            'skinType': 'oily',
            'ageRange': '25-34',
            'concerns': ['acne', 'dark spots'],
            'preferredIngredients': ['niacinamide'],
            'avoidIngredients': ['fragrance']
        }
        
        analysis = recommender.generate_skin_analysis(user_profile)
        print(f"✅ Generated skin analysis ({len(str(analysis))} characters)")
        
        print("\n🎉 Logging test completed successfully!")
        print("📁 Check the 'logs' directory for detailed interaction logs")
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_logging()
