const fetch = require('node-fetch');

async function testBatchEndpoint() {
  const slotId = 'ts-1764308199166-23ukk7soo7c';
  
  console.log(`\n🧪 Testing batch endpoint for slot: ${slotId}\n`);
  
  const response = await fetch('http://localhost:9002/api/timeslots/credits-slots-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotIds: [slotId] })
  });
  
  const data = await response.json();
  
  console.log('📦 Response:', JSON.stringify(data, null, 2));
  
  if (data[slotId]) {
    console.log(`\n✅ creditsSlots for ${slotId}:`, data[slotId]);
    console.log(`   Tipo:`, typeof data[slotId]);
    console.log(`   Es array:`, Array.isArray(data[slotId]));
    if (Array.isArray(data[slotId])) {
      console.log(`   Contiene índice 0:`, data[slotId].includes(0));
      console.log(`   Contiene índice 1:`, data[slotId].includes(1));
    }
  }
}

testBatchEndpoint().catch(console.error);
