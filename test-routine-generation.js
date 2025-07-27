async function testRoutineGeneration() {
  try {
    console.log('🧪 Testing routine generation specifically...');
    
    const testPayload = {
      skin_type: "Combination",
      ingredients: ["Niacinamide"],
      avoid_ingredients: [],
      age_group: "25-34",
      price_range: [500, 1500],
      skin_concerns: ["Acne"]
    };

    const response = await fetch('http://127.0.0.1:8000/api/recommend-products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Response received!');
      console.log('📊 Recommendations count:', data.recommendations?.length || 0);
      
      if (data.routine) {
        console.log('\n🌅 MORNING ROUTINE:');
        data.routine.morning?.forEach((step, index) => {
          console.log(`  ${index + 1}. ${step.step}: ${step.instruction}`);
          if (step.product) {
            console.log(`     Product: ${step.product.name} - ${step.product.price}`);
          }
        });
        
        console.log('\n🌙 EVENING ROUTINE:');
        data.routine.evening?.forEach((step, index) => {
          console.log(`  ${index + 1}. ${step.step}: ${step.instruction}`);
          if (step.product) {
            console.log(`     Product: ${step.product.name} - ${step.product.price}`);
          }
        });
      } else {
        console.log('❌ No routine generated');
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Error:', errorText);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRoutineGeneration();
