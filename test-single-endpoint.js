async function testSingleEndpoint() {
  try {
    // Primero obtener un ID de clase confirmada
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const confirmedSlot = await prisma.timeSlot.findFirst({
      where: { courtId: { not: null } }
    });
    
    if (!confirmedSlot) {
      console.log('❌ No hay clases confirmadas');
      await prisma.$disconnect();
      return;
    }
    
    console.log('✅ Clase encontrada:', confirmedSlot.id);
    await prisma.$disconnect();
    
    // Ahora probar el endpoint
    const response = await fetch(`http://localhost:9002/api/timeslots/${confirmedSlot.id}`);
    const data = await response.json();
    
    console.log('\n📦 Respuesta del endpoint:');
    console.log('- Tiene startTime?', !!data.startTime);
    console.log('- Tiene endTime?', !!data.endTime);
    console.log('- startTime:', data.startTime);
    console.log('- endTime:', data.endTime);
    console.log('- instructorName:', data.instructorName);
    console.log('- courtNumber:', data.courtNumber);
    console.log('- bookings:', data.bookings?.length || 0);
    
    // Probar parse con date-fns
    const { format } = require('date-fns');
    const { es } = require('date-fns/locale');
    
    console.log('\n✅ Test de date-fns:');
    console.log('- Día:', format(data.startTime, 'dd', { locale: es }));
    console.log('- Día semana:', format(data.startTime, 'EEEE', { locale: es }));
    console.log('- Mes:', format(data.startTime, 'MMMM', { locale: es }));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testSingleEndpoint();
