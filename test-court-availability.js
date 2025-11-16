// Script para probar la disponibilidad de pistas en la API
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCourtAvailability() {
  console.log('🏟️ PROBANDO DISPONIBILIDAD DE PISTAS\n');
  
  try {
    // 1. Obtener todas las pistas del club
    const courts = await prisma.court.findMany({
      where: { 
        clubId: 'padel-estrella-madrid',
        isActive: true 
      },
      orderBy: { number: 'asc' }
    });
    
    console.log(`📋 Total pistas del club: ${courts.length}`);
    courts.forEach(c => console.log(`  - Pista ${c.number} (ID: ${c.id})`));
    
    // 2. Buscar clases de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayTimestamp = today.getTime();
    const tomorrowTimestamp = tomorrow.getTime();
    
    console.log(`\n📅 Buscando clases del ${today.toLocaleDateString('es-ES')}...`);
    
    // Clases propuestas (sin pista asignada)
    const proposals = await prisma.$queryRaw`
      SELECT * FROM TimeSlot 
      WHERE clubId = 'padel-estrella-madrid'
        AND start >= ${todayTimestamp}
        AND start < ${tomorrowTimestamp}
        AND courtId IS NULL
      ORDER BY start
      LIMIT 10
    `;
    
    // Clases confirmadas (con pista asignada)
    const confirmed = await prisma.$queryRaw`
      SELECT t.*, c.number as courtNumber
      FROM TimeSlot t
      LEFT JOIN Court c ON t.courtId = c.id
      WHERE t.clubId = 'padel-estrella-madrid'
        AND t.start >= ${todayTimestamp}
        AND t.start < ${tomorrowTimestamp}
        AND t.courtId IS NOT NULL
      ORDER BY t.start
    `;
    
    console.log(`\n✅ Propuestas (sin pista): ${proposals.length}`);
    console.log(`✅ Confirmadas (con pista): ${confirmed.length}`);
    
    // 3. Simular cálculo de disponibilidad para la primera propuesta
    if (proposals.length > 0) {
      const testSlot = proposals[0];
      const slotStart = Number(testSlot.start);
      const slotEnd = Number(testSlot.end);
      const startTime = new Date(slotStart).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const endTime = new Date(slotEnd).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      
      console.log(`\n🎯 Analizando propuesta de ${startTime} a ${endTime}:`);
      console.log(`   Instructor ID: ${testSlot.instructorId}`);
      
      // Calcular disponibilidad de cada pista
      const availability = courts.map(court => {
        const isOccupied = confirmed.some(cls => {
          const clsStart = Number(cls.start);
          const clsEnd = Number(cls.end);
          const isSameCourt = cls.courtId === court.id;
          const hasOverlap = slotStart < clsEnd && slotEnd > clsStart;
          return isSameCourt && hasOverlap;
        });
        
        return {
          courtNumber: court.number,
          status: isOccupied ? 'occupied' : 'available'
        };
      });
      
      console.log(`\n   📊 Estado de pistas para este horario:`);
      availability.forEach(a => {
        const emoji = a.status === 'available' ? '🟢' : '🔴';
        console.log(`   ${emoji} Pista ${a.courtNumber}: ${a.status === 'available' ? 'DISPONIBLE' : 'OCUPADA'}`);
      });
      
      const availableCount = availability.filter(a => a.status === 'available').length;
      console.log(`\n   ✅ Total pistas disponibles: ${availableCount}/${courts.length}`);
      
      if (availableCount === 0) {
        console.log(`   ⚠️ ESTA TARJETA DEBERÍA OCULTARSE (sin pistas disponibles)`);
      } else {
        console.log(`   ✅ ESTA TARJETA DEBE MOSTRARSE (${availableCount} pistas libres)`);
      }
    }
    
    // 4. Mostrar ocupación actual de pistas
    if (confirmed.length > 0) {
      console.log(`\n\n📍 CLASES CONFIRMADAS HOY:\n`);
      confirmed.forEach(cls => {
        const start = new Date(Number(cls.start));
        const end = new Date(Number(cls.end));
        const timeRange = `${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
        console.log(`   🎾 Pista ${cls.courtNumber}: ${timeRange}`);
      });
    }
    
    console.log(`\n✅ Test completado\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCourtAvailability();
