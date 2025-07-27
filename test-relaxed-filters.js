async function testFiltering() {
  try {
    console.log('🔍 Testing current filtering logic...');
    
    const testPayload = {
      skin_type: "Combination",
      ingredients: ["Niacinamide"],  // Reduced to just one
      avoid_ingredients: [],         // Removed avoid ingredients
      age_group: "25-34",
      price_range: [0, 5000],        // Wider price range
      skin_concerns: ["Acne"]        // Just one concern
    };

    console.log('📤 Testing with relaxed filters:', JSON.stringify(testPayload, null, 2));

    const response = await fetch('http://127.0.0.1:8000/api/recommend-products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Relaxed filtering results:');
      console.log('📊 Recommendations count:', data.recommendations?.length || 0);
      console.log('🧴 Sample products:');
      data.recommendations?.slice(0, 5).forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name} - ${product.price}`);
      });
    } else {
      const errorText = await response.text();
      console.log('❌ Error:', errorText);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFiltering();
