const fetch = require('node-fetch');

async function testCreateNow() {
  try {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);

    const data = {
      clubId: 'padel-estrella-madrid',
      startTime: now.toISOString(),
      instructorId: 'cmjhhs1k30002tga4zzj2etzc',
      maxPlayers: 4,
      level: 'abierto',
      category: 'abierta',
      durationMinutes: 60
    };

    console.log('🧪 Probando crear clase...');
    console.log('📤 POST http://localhost:9002/api/timeslots');
    console.log('📦 Body:', JSON.stringify(data, null, 2));

    const response = await fetch('http://localhost:9002/api/timeslots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    console.log('\n📥 Respuesta:');
    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ Clase creada con éxito!');
    } else {
      console.log('\n❌ Error al crear clase');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testCreateNow();
