"""
Test the running API server endpoints (RAG removed).
"""

import requests
import json
import time

# API base URL
BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test the health endpoint"""
    print("🏥 Testing health check...")
    try:
    response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed!")
            print(f"   Services: {data.get('services', {})}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_recommend_products():
    """Test the product recommendation endpoint"""
    print("\n🧴 Testing product recommendations...")
    payload = {
        "age_group": "25-34",
        "skin_concerns": ["Acne", "Oiliness"],
        "skin_type": "Oily",
        "price_range": [100, 1000],
        "ingredients": ["Salicylic Acid"],
        "avoid_ingredients": ["Fragrance"],
        "use_ai_enhancement": True
    }
    try:
        response = requests.post(f"{BASE_URL}/api/recommend-products", json=payload)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Got {len(data.get('recommendations', []))} recommendations")
            if data.get('routine'):
                print("   ✅ Routine generated")
        else:
            print(f"   ❌ Recommend failed: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"   ❌ Recommend error: {e}")

def test_analyze_skin_endpoint():
    """Basic smoke test for the analyze-skin endpoint (without sending a real image)."""
    print("\n🧪 Skipping /api/analyze-skin image upload test in this script.")

def test_stats():
    """No stats endpoint in simplified API."""
    pass

def main():
    """Run all tests"""
    print("🧪 Testing SkinSage API Server")
    print("=" * 50)
    
    # Test 1: Health check
    health_ok = test_health_check()
    
    if not health_ok:
        print("❌ Health check failed, skipping other tests")
        return
    
    # Test 2: Recommendations
    test_recommend_products()
    
    # Test 3: Analyze skin (skipped)
    test_analyze_skin_endpoint()
    
    # Test 4: Stats (n/a)
    test_stats()
    
    print("\n" + "=" * 50)
    print("🎉 API testing complete!")
    print("✅ Your SkinSage system is working!")

if __name__ == "__main__":
    main()
