// Copiar y pegar esto en la consola del navegador (F12)
async function testBatchAPI() {
  console.log('🌐 Probando API Batch de creditsSlots\n');
  
  const slotId = 'ts-1764308189412-z9y4veby1rd';
  
  console.log(`📤 Enviando petición a /api/timeslots/credits-slots-batch`);
  console.log(`   Slot ID: ${slotId}\n`);
  
  const response = await fetch('/api/timeslots/credits-slots-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotIds: [slotId] })
  });
  
  console.log(`📥 Status: ${response.status}\n`);
  
  const data = await response.json();
  console.log('✅ Response:', data);
  console.log('');
  
  if (data[slotId]) {
    console.log(`🎁 creditsSlots: [${data[slotId].join(', ')}]`);
    console.log(`   Es array: ${Array.isArray(data[slotId])}`);
    console.log('');
    
    console.log('🎨 Evaluación visual:');
    [1, 2, 3, 4].forEach(m => {
      const isCredits = data[slotId].includes(m);
      console.log(`   ${m} jug: ${isCredits ? '🎁 DORADO' : '⚪ Verde'}`);
    });
  }
}

// Ejecutar
testBatchAPI();
