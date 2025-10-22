const fetch = require('node-fetch');

async function test() {
  try {
    console.log('📡 Probando /api/timeslots...');
    const response = await fetch('http://localhost:9002/api/timeslots?date=2025-10-18&clubId=club-padel-estrella');
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
