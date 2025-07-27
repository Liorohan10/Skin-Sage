async function testBackend() {
  try {
    console.log('🧪 Testing Python backend with correct payload format...');
    
    const testPayload = {
      skin_type: "Combination",
      ingredients: ["Niacinamide", "Hyaluronic Acid"],
      avoid_ingredients: ["Alcohol", "Fragrance"],
      age_group: "25-34",
      price_range: [500, 2000], // Array of integers
      skin_concerns: ["Acne", "Dark Spots", "Oily T-Zone"]
    };

    console.log('📤 Sending payload:', JSON.stringify(testPayload, null, 2));

    const response = await fetch('http://127.0.0.1:8000/api/recommend-products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    console.log('📥 Response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend response successful!');
      console.log('📊 Recommendations count:', data.recommendations?.length || 0);
      console.log('🧴 Sample products:');
      data.recommendations?.slice(0, 3).forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name} - ${product.price}`);
      });
      console.log('📋 Routine available:', !!data.routine);
      if (data.routine) {
        console.log('🌅 Morning steps:', data.routine.morning?.length || 0);
        console.log('🌙 Evening steps:', data.routine.evening?.length || 0);
      }
    } else {
      console.log('❌ Backend request failed');
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }
  } catch (error) {
    console.error('❌ Error testing backend:', error.message);
  }
}

testBackend();
