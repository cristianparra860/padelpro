const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateAPI() {
  try {
    const date = '2025-11-24';
    const clubId = 'padel-estrella-madrid';
    
    console.log('\n🔍 SIMULANDO EL FLUJO COMPLETO DEL API /timeslots\n');
    console.log('═'.repeat(80));
    
    // PASO 1: Query SQL inicial
    console.log('\n📝 PASO 1: Query SQL inicial');
    const query = `SELECT * FROM TimeSlot WHERE clubId = ? AND start >= ? AND start <= ? ORDER BY start ASC`;
    const params = [clubId, date + 'T00:00:00.000Z', date + 'T23:59:59.999Z'];
    
    const timeSlots = await prisma.$queryRawUnsafe(query, ...params);
    console.log(`   Resultado: ${timeSlots.length} TimeSlots encontrados`);
    
    // Filtrar solo las 06:00 UTC
    const slots6AM = timeSlots.filter(s => {
      const start = new Date(s.start);
      return start.getUTCHours() === 6 && start.getUTCMinutes() === 0;
    });
    
    console.log(`   De esos, ${slots6AM.length} son a las 06:00 UTC (7:00 España)`);
    
    // Contar Carlos
    const carlosInSQL = slots6AM.filter(s => s.instructorId === 'cmhkwmdc10005tgqw6fn129he');
    console.log(`   Carlos Martinez tiene ${carlosInSQL.length} tarjetas en la query SQL`);
    
    // PASO 2: Obtener instructores
    console.log('\n📝 PASO 2: Obtener instructores');
    const instructorIds = timeSlots.map(slot => slot.instructorId).filter(Boolean);
    const allInstructors = await prisma.instructor.findMany({
      where: { id: { in: instructorIds } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePictureUrl: true
          }
        }
      }
    });
    console.log(`   ${allInstructors.length} instructores cargados`);
    
    const carlos = allInstructors.find(i => i.user.name === 'Carlos Martinez');
    console.log(`   Carlos Martinez ID: ${carlos?.id}`);
    
    // PASO 3: Obtener pistas
    console.log('\n📝 PASO 3: Obtener pistas del club');
    const allCourts = await prisma.court.findMany({
      where: {
        clubId: clubId,
        isActive: true
      },
      orderBy: { number: 'asc' }
    });
    console.log(`   ${allCourts.length} pistas encontradas`);
    
    // PASO 4: Clases confirmadas
    console.log('\n📝 PASO 4: Clases confirmadas (con courtId)');
    const confirmedClasses = await prisma.$queryRawUnsafe(`
      SELECT t.id, t.start, t.end, t.courtId, c.number as courtNumber
      FROM TimeSlot t
      LEFT JOIN Court c ON t.courtId = c.id
      WHERE t.clubId = ?
        AND t.start >= ? AND t.start <= ?
        AND t.courtId IS NOT NULL
      ORDER BY t.start
    `, clubId, date + 'T00:00:00.000Z', date + 'T23:59:59.999Z');
    console.log(`   ${confirmedClasses.length} clases confirmadas`);
    
    // PASO 5: Formatear slots
    console.log('\n📝 PASO 5: Formatear slots (sin filtros aún)');
    const formattedSlots = slots6AM.map(slot => {
      const instructor = allInstructors.find(i => i.id === slot.instructorId);
      const instructorName = instructor?.user?.name || 'Desconocido';
      
      const slotStart = new Date(slot.start).getTime();
      const slotEnd = new Date(slot.end).getTime();
      
      const courtsAvailability = allCourts.map(court => {
        const isOccupied = confirmedClasses.some(cls => {
          const clsStart = new Date(cls.start).getTime();
          const clsEnd = new Date(cls.end).getTime();
          const isSameCourt = cls.courtId === court.id;
          const hasOverlap = slotStart < clsEnd && slotEnd > clsStart;
          return isSameCourt && hasOverlap;
        });
        
        return {
          courtNumber: court.number,
          status: isOccupied ? 'occupied' : 'available'
        };
      });
      
      const availableCourtsCount = courtsAvailability.filter(c => c.status === 'available').length;
      
      return {
        id: slot.id,
        instructorName,
        level: slot.level,
        genderCategory: slot.genderCategory,
        courtId: slot.courtId,
        availableCourtsCount
      };
    });
    
    console.log(`   ${formattedSlots.length} slots formateados`);
    const carlosFormatted = formattedSlots.filter(s => s.instructorName === 'Carlos Martinez');
    console.log(`   Carlos Martinez: ${carlosFormatted.length} tarjetas`);
    carlosFormatted.forEach((s, i) => {
      console.log(`      ${i + 1}. ${s.level}/${s.genderCategory} | availableCourtsCount: ${s.availableCourtsCount} | courtId: ${s.courtId ? 'YES' : 'NULL'}`);
    });
    
    // PASO 6: Filtrar propuestas sin pista asignada
    console.log('\n📝 PASO 6: Separar propuestas vs confirmadas');
    const proposalsOnly = formattedSlots.filter(slot => !slot.courtId);
    const confirmedOnly = formattedSlots.filter(slot => slot.courtId);
    console.log(`   Propuestas (courtId=NULL): ${proposalsOnly.length}`);
    console.log(`   Confirmadas (courtId!=NULL): ${confirmedOnly.length}`);
    
    const carlosProposals = proposalsOnly.filter(s => s.instructorName === 'Carlos Martinez');
    console.log(`   Carlos en propuestas: ${carlosProposals.length}`);
    
    // PASO 7: Filtrar por disponibilidad de pistas
    console.log('\n📝 PASO 7: Filtrar propuestas sin pistas disponibles');
    console.log('   Regla: slot.availableCourtsCount > 0');
    
    const availableProposals = proposalsOnly.filter(slot => slot.availableCourtsCount > 0);
    console.log(`   Antes: ${proposalsOnly.length} propuestas`);
    console.log(`   Después: ${availableProposals.length} propuestas`);
    console.log(`   Eliminadas: ${proposalsOnly.length - availableProposals.length}`);
    
    const carlosAfterFilter = availableProposals.filter(s => s.instructorName === 'Carlos Martinez');
    console.log(`\n   Carlos después del filtro: ${carlosAfterFilter.length} tarjetas`);
    carlosAfterFilter.forEach((s, i) => {
      console.log(`      ${i + 1}. ${s.level}/${s.genderCategory} | ID: ${s.id.substring(0, 15)}...`);
    });
    
    // PASO 8: Combinar
    console.log('\n📝 PASO 8: Combinar propuestas + confirmadas');
    const finalSlots = [...availableProposals, ...confirmedOnly];
    console.log(`   Total final: ${finalSlots.length} slots`);
    
    const carlosFinal = finalSlots.filter(s => s.instructorName === 'Carlos Martinez');
    console.log(`   Carlos Martinez en resultado final: ${carlosFinal.length} tarjetas`);
    
    console.log('\n═'.repeat(80));
    console.log('\n🎯 CONCLUSIÓN:');
    if (carlosFinal.length === 2) {
      console.log('   ✅ El API DEBERÍA devolver 2 tarjetas de Carlos Martinez');
    } else {
      console.log(`   ❌ El API solo devuelve ${carlosFinal.length} tarjeta(s) de Carlos`);
      console.log(`   🔍 Se perdieron ${2 - carlosFinal.length} tarjeta(s) en algún paso`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simulateAPI();
