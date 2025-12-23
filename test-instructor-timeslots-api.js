const fetch = require('node-fetch');

async function testInstructorTimeSlots() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Obtener un instructor
    const instructor = await prisma.instructor.findFirst({
      where: {
        clubId: 'padel-estrella-madrid'
      }
    });

    if (!instructor) {
      console.log('❌ No se encontró instructor');
      return;
    }

    console.log(`✅ Instructor: ${instructor.name} (${instructor.id})\n`);

    // Consultar API de timeslots
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`📅 Consultando fecha: ${dateStr}`);
    console.log(`🔗 URL: http://localhost:9002/api/timeslots?instructorId=${instructor.id}&date=${dateStr}\n`);

    const response = await fetch(`http://localhost:9002/api/timeslots?instructorId=${instructor.id}&date=${dateStr}`);
    const result = await response.json();

    console.log('📊 Respuesta del API:');
    console.log(`   Status: ${response.status}`);
    console.log(`   TimeSlots encontrados: ${result.timeSlots?.length || 0}\n`);

    if (result.timeSlots && result.timeSlots.length > 0) {
      console.log('📋 Clases encontradas:\n');
      result.timeSlots.forEach((slot, idx) => {
        const start = new Date(Number(slot.start));
        console.log(`${idx + 1}. ${start.toLocaleString('es-ES')}`);
        console.log(`   ID: ${slot.id}`);
        console.log(`   Pista: ${slot.courtNumber || 'Sin asignar'}`);
        console.log(`   Bookings: ${slot.bookings?.length || 0}`);
        console.log('');
      });
    } else {
      console.log('❌ No se encontraron clases para este instructor en esta fecha');
    }

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testInstructorTimeSlots();
