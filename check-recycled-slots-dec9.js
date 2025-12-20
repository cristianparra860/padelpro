const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecycledSlots() {
  try {
    console.log('\n=== VERIFICANDO PLAZAS RECICLADAS - 9 DIC 2025 ===\n');
    
    // Buscar el timeslot de Carlos Martinez el 9 de diciembre
    const targetDate = new Date('2025-12-09T09:00:00.000Z');
    const startOfDay = new Date('2025-12-09T00:00:00.000Z');
    const endOfDay = new Date('2025-12-09T23:59:59.999Z');
    
    console.log('🔍 Buscando timeslots del 9 de diciembre...\n');
    
    // Usar raw SQL porque los timestamps son integers
    const timeslots = await prisma.$queryRawUnsafe(`
      SELECT 
        ts.*,
        i.name as instructorName,
        i.id as instructorId
      FROM TimeSlot ts
      INNER JOIN Instructor i ON ts.instructorId = i.id
      WHERE ts.start >= ? AND ts.start <= ?
        AND ts.clubId = ?
    `, startOfDay.getTime(), endOfDay.getTime(), 'padel-estrella-madrid');
    
    // Obtener bookings para cada timeslot
    for (const ts of timeslots) {
      ts.bookings = await prisma.booking.findMany({
        where: { timeSlotId: ts.id },
        include: { user: true }
      });
    }
    
    console.log(`📊 Total timeslots encontrados: ${timeslots.length}\n`);
    
    // Filtrar los que tienen plazas recicladas
    const withRecycled = timeslots.filter(ts => ts.hasRecycledSlots);
    
    console.log(`♻️  Timeslots con plazas recicladas: ${withRecycled.length}\n`);
    
    if (withRecycled.length > 0) {
      withRecycled.forEach(ts => {
        const date = new Date(Number(ts.start));
        console.log('\n📅 TimeSlot:', {
          id: ts.id,
          instructor: ts.instructorName,
          hora: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          hasRecycledSlots: ts.hasRecycledSlots,
          availableRecycledSlots: ts.availableRecycledSlots,
          recycledSlotsOnlyPoints: ts.recycledSlotsOnlyPoints
        });
        
        console.log('\n  📋 Bookings:');
        ts.bookings.forEach(b => {
          console.log(`    - ${b.user.name}: ${b.status} (groupSize: ${b.groupSize})`);
        });
      });
    } else {
      console.log('⚠️  NO HAY TIMESLOTS CON PLAZAS RECICLADAS');
      console.log('\n📋 Mostrando todos los timeslots del día:\n');
      
      timeslots.forEach(ts => {
        const date = new Date(Number(ts.start));
        console.log(`\n⏰ ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${ts.instructorName}`);
        console.log(`   hasRecycledSlots: ${ts.hasRecycledSlots}`);
        console.log(`   availableRecycledSlots: ${ts.availableRecycledSlots}`);
        console.log(`   Bookings (${ts.bookings?.length || 0}):`);
        ts.bookings?.forEach(b => {
          console.log(`     - ${b.user.name}: ${b.status}`);
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecycledSlots();
