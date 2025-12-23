const fetch = require('node-fetch');

async function testCreateTimeSlot() {
  try {
    console.log('🧪 Probando creación de TimeSlot vía API...\n');

    // Datos para crear una clase de prueba
    const now = new Date();
    now.setHours(now.getHours() + 2); // 2 horas en el futuro
    now.setMinutes(0, 0, 0);

    const testData = {
      clubId: 'padel-estrella-madrid',
      startTime: now.toISOString(),
      instructorId: '', // Necesitamos obtener un instructor real
      maxPlayers: 4,
      level: 'abierto',
      category: 'abierta',
      durationMinutes: 60
    };

    // Primero obtener un instructor
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const instructor = await prisma.instructor.findFirst({
      where: {
        clubId: 'padel-estrella-madrid',
        isActive: true
      }
    });

    if (!instructor) {
      console.log('❌ No se encontró ningún instructor activo en Padel Estrella Madrid');
      await prisma.$disconnect();
      return;
    }

    console.log(`✅ Instructor encontrado: ${instructor.name} (${instructor.id})`);
    testData.instructorId = instructor.id;

    await prisma.$disconnect();

    console.log('\n📤 Enviando petición POST a /api/timeslots...');
    console.log('Datos:', JSON.stringify(testData, null, 2));

    const response = await fetch('http://localhost:9002/api/timeslots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    console.log('\n📥 Respuesta del servidor:');
    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(result, null, 2));

    if (response.ok && result.success) {
      console.log('\n✅ ¡TimeSlot creado exitosamente!');
      console.log(`ID: ${result.timeSlot.id}`);
    } else {
      console.log('\n❌ Error al crear TimeSlot');
      console.log('Error:', result.error || result.details);
    }

  } catch (error) {
    console.error('\n❌ Error en la prueba:', error);
  }
}

testCreateTimeSlot();
