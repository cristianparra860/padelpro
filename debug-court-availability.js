const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugCourtAvailability() {
  try {
    const date = '2025-11-24';
    const clubId = 'padel-estrella-madrid';
    
    // 1. Obtener tarjetas de Carlos a las 06:00 UTC
    const carlosSlots = await prisma.timeSlot.findMany({
      where: {
        start: new Date('2025-11-24T06:00:00.000Z'),
        instructor: {
          name: 'Carlos Martinez'
        }
      },
      select: {
        id: true,
        start: true,
        end: true,
        level: true,
        genderCategory: true,
        courtId: true,
        clubId: true
      }
    });
    
    console.log('\n🎯 Tarjetas de Carlos Martinez a las 06:00 UTC:');
    console.log(`   Total: ${carlosSlots.length}`);
    carlosSlots.forEach((s, i) => {
      console.log(`\n   ${i + 1}. ID: ${s.id.substring(0, 15)}...`);
      console.log(`      Level: ${s.level}`);
      console.log(`      Gender: ${s.genderCategory}`);
      console.log(`      CourtId: ${s.courtId ? '✅ ASIGNADO' : '❌ NULL'}`);
      console.log(`      ClubId: ${s.clubId}`);
    });
    
    // 2. Obtener pistas del club
    const allCourts = await prisma.court.findMany({
      where: {
        clubId: clubId,
        isActive: true
      },
      orderBy: { number: 'asc' }
    });
    
    console.log(`\n\n🏟️  Total pistas activas del club: ${allCourts.length}`);
    allCourts.forEach(c => {
      console.log(`   - Pista ${c.number} (ID: ${c.id.substring(0, 15)}...)`);
    });
    
    // 3. Obtener clases confirmadas del día (con courtId asignado)
    const confirmedClasses = await prisma.$queryRawUnsafe(`
      SELECT 
        t.id,
        t.start,
        t.end,
        t.courtId,
        c.number as courtNumber
      FROM TimeSlot t
      LEFT JOIN Court c ON t.courtId = c.id
      WHERE t.clubId = ?
        AND t.start >= ? AND t.start <= ?
        AND t.courtId IS NOT NULL
      ORDER BY t.start
    `, 
      clubId,
      date + 'T00:00:00.000Z',
      date + 'T23:59:59.999Z'
    );
    
    console.log(`\n\n📅 Clases confirmadas del día 24 (con pista asignada): ${confirmedClasses.length}`);
    if (confirmedClasses.length > 0) {
      confirmedClasses.forEach(cls => {
        const start = new Date(cls.start);
        console.log(`   - ${start.toISOString().substring(11, 16)} | Pista ${cls.courtNumber} | ID: ${cls.id.substring(0, 15)}...`);
      });
    }
    
    // 4. Calcular disponibilidad para las tarjetas de Carlos
    console.log('\n\n🔍 DISPONIBILIDAD DE PISTAS PARA TARJETAS DE CARLOS:');
    
    carlosSlots.forEach((slot, idx) => {
      const slotStart = new Date(slot.start).getTime();
      const slotEnd = new Date(slot.end).getTime();
      
      console.log(`\n   Tarjeta ${idx + 1} (${slot.level}/${slot.genderCategory}):`);
      console.log(`   Horario: ${new Date(slot.start).toISOString()} - ${new Date(slot.end).toISOString()}`);
      
      const courtsAvailability = allCourts.map(court => {
        const isOccupied = confirmedClasses.some((cls) => {
          const clsStart = new Date(cls.start).getTime();
          const clsEnd = new Date(cls.end).getTime();
          
          const isSameCourt = cls.courtId === court.id;
          const hasOverlap = slotStart < clsEnd && slotEnd > clsStart;
          
          return isSameCourt && hasOverlap;
        });
        
        return {
          courtNumber: court.number,
          courtId: court.id.substring(0, 15),
          status: isOccupied ? 'OCUPADA' : 'DISPONIBLE'
        };
      });
      
      const availableCount = courtsAvailability.filter(c => c.status === 'DISPONIBLE').length;
      
      console.log(`   Pistas:`);
      courtsAvailability.forEach(c => {
        console.log(`      ${c.status === 'DISPONIBLE' ? '✅' : '❌'} Pista ${c.courtNumber}: ${c.status}`);
      });
      
      console.log(`\n   📊 availableCourtsCount: ${availableCount}`);
      
      if (availableCount === 0) {
        console.log(`   ⚠️  ESTA TARJETA SERÁ FILTRADA por el API (availableCourtsCount = 0)`);
      } else {
        console.log(`   ✅ Esta tarjeta PASARÁ el filtro del API`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCourtAvailability();
