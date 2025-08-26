// Quick test to check if backend is returning data
async function testBackendFlow() {
  try {
    console.log('🧪 Testing backend flow...');
    
    const testPayload = {
      age_group: "25-34",
      skin_concerns: ["Acne"],
      skin_type: "Combination",
      price_range: [500, 2000],
      ingredients: ["Niacinamide"],
      avoid_ingredients: ["Fragrance"],
      use_ai_enhancement: true
    };

    console.log('📤 Sending payload:', JSON.stringify(testPayload, null, 2));

    // Test direct backend call
    const backendResponse = await fetch('http://127.0.0.1:8001/api/recommend-products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    console.log('📥 Backend response status:', backendResponse.status);

    if (backendResponse.ok) {
      const backendData = await backendResponse.json();
      console.log('✅ Backend response successful!');
      console.log('🔍 Backend response structure:');
      console.log('- recommendations:', Array.isArray(backendData.recommendations) ? `Array(${backendData.recommendations.length})` : typeof backendData.recommendations);
      console.log('- routine:', typeof backendData.routine);
      console.log('- skin_analysis:', typeof backendData.skin_analysis);
      
      if (backendData.recommendations && backendData.recommendations.length > 0) {
        console.log('📊 Sample recommendation:', backendData.recommendations[0]);
      }
      
      if (backendData.routine) {
        console.log('📋 Routine structure:', Object.keys(backendData.routine));
      }
      
      if (backendData.skin_analysis) {
        console.log('🔬 Skin analysis:', typeof backendData.skin_analysis === 'string' ? backendData.skin_analysis.slice(0, 100) + '...' : backendData.skin_analysis);
      }
    } else {
      console.log('❌ Backend request failed');
      const errorText = await backendResponse.text();
      console.log('Error details:', errorText);
    }

    // Test via Next.js proxy
    console.log('\n🔄 Testing via Next.js proxy...');
    const proxyResponse = await fetch('/api/backend/recommend-products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    console.log('📥 Proxy response status:', proxyResponse.status);

    if (proxyResponse.ok) {
      const proxyData = await proxyResponse.json();
      console.log('✅ Proxy response successful!');
      console.log('🔍 Proxy response structure matches backend:', 
        JSON.stringify(Object.keys(proxyData).sort()) === JSON.stringify(Object.keys(backendData || {}).sort()));
    } else {
      console.log('❌ Proxy request failed');
      const errorText = await proxyResponse.text();
      console.log('Error details:', errorText);
    }

  } catch (error) {
    console.error('❌ Error testing backend:', error.message);
  }
}

// Run the test
testBackendFlow();
