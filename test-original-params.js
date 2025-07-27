async function testOriginalParams() {
  try {
    console.log('🔍 Testing with original restrictive parameters...');
    
    const testPayload = {
      skin_type: "Combination",
      ingredients: ["Niacinamide", "Hyaluronic Acid"],
      avoid_ingredients: ["Alcohol", "Fragrance"],
      age_group: "25-34",
      price_range: [500, 1500], // mid-tier range
      skin_concerns: ["Acne", "Dark Spots", "Oily T-Zone"]
    };

    console.log('📤 Testing with original params:', JSON.stringify(testPayload, null, 2));

    const response = await fetch('http://127.0.0.1:8000/api/recommend-products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Original parameters results:');
      console.log('📊 Recommendations count:', data.recommendations?.length || 0);
      console.log('🧴 Sample products:');
      data.recommendations?.slice(0, 8).forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name} - ${product.price} (${product.brand})`);
      });
    } else {
      const errorText = await response.text();
      console.log('❌ Error:', errorText);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testOriginalParams();
