// Simple test script for API endpoints

async function testDemo() {
  try {
    console.log('🧪 Testing demo endpoint...');
    const response = await fetch('http://localhost:3000/api/demo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        testImageAnalysis: false,
        userProfile: {
          skinType: "Combination",
          preferredIngredients: ["Niacinamide", "Hyaluronic Acid"],
          avoidIngredients: ["Alcohol", "Fragrance"],
          ageRange: "25-34",
          budget: "mid-tier",
          concerns: ["Acne", "Dark Spots", "Oily T-Zone"]
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Demo endpoint response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Demo endpoint failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }
  } catch (error) {
    console.error('❌ Error testing demo endpoint:', error.message);
  }
}

testDemo();
