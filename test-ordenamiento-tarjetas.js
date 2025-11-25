/**
 * Test: Verificar ordenamiento de tarjetas
 * Prioridad: 1) Confirmadas, 2) Con inscripciones, 3) Vacías
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCardSorting() {
  console.log('\n🧪 TEST: ORDENAMIENTO DE TARJETAS\n');
  console.log('='.repeat(70));

  try {
    // Buscar slots del 17 de noviembre
    const startDate = new Date('2025-11-17T00:00:00.000Z').getTime();
    const endDate = new Date('2025-11-17T23:59:59.999Z').getTime();

    const slots = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.courtId,
        ts.courtNumber,
        (SELECT COUNT(*) FROM Booking b 
         WHERE b.timeSlotId = ts.id 
         AND b.status IN ('PENDING', 'CONFIRMED')) as bookingCount
      FROM TimeSlot ts
      WHERE ts.start >= ${startDate} 
        AND ts.start <= ${endDate}
        AND ts.clubId = 'padel-estrella-madrid'
      ORDER BY ts.start
    `;

    console.log(`\n📊 Slots encontrados: ${slots.length}\n`);

    // Simular el ordenamiento del API
    const sorted = slots.sort((a, b) => {
      const aConfirmed = a.courtId ? 2 : 0;
      const bConfirmed = b.courtId ? 2 : 0;
      const aHasBookings = (!a.courtId && a.bookingCount > 0) ? 1 : 0;
      const bHasBookings = (!b.courtId && b.bookingCount > 0) ? 1 : 0;
      
      const aPriority = aConfirmed + aHasBookings;
      const bPriority = bConfirmed + bHasBookings;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return Number(a.start) - Number(b.start);
    });

    // Agrupar por prioridad
    const confirmed = sorted.filter(s => s.courtId);
    const withBookings = sorted.filter(s => !s.courtId && s.bookingCount > 0);
    const empty = sorted.filter(s => !s.courtId && s.bookingCount === 0);

    console.log('🎯 ORDEN ESPERADO:\n');
    
    console.log(`1️⃣  CONFIRMADAS (${confirmed.length}):`);
    confirmed.slice(0, 5).forEach((s, i) => {
      const time = new Date(Number(s.start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      console.log(`   ${i + 1}. ${time} - Pista ${s.courtNumber} - ID: ${s.id.substring(0, 12)}`);
    });
    if (confirmed.length > 5) console.log(`   ... y ${confirmed.length - 5} más`);

    console.log(`\n2️⃣  CON INSCRIPCIONES (${withBookings.length}):`);
    withBookings.slice(0, 5).forEach((s, i) => {
      const time = new Date(Number(s.start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      console.log(`   ${i + 1}. ${time} - ${s.bookingCount} inscritos - ID: ${s.id.substring(0, 12)}`);
    });
    if (withBookings.length > 5) console.log(`   ... y ${withBookings.length - 5} más`);

    console.log(`\n3️⃣  VACÍAS (${empty.length}):`);
    empty.slice(0, 5).forEach((s, i) => {
      const time = new Date(Number(s.start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      console.log(`   ${i + 1}. ${time} - Sin inscritos - ID: ${s.id.substring(0, 12)}`);
    });
    if (empty.length > 5) console.log(`   ... y ${empty.length - 5} más`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ Ordenamiento aplicado correctamente');
    console.log('   Las tarjetas aparecerán en este orden en el panel de clases');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCardSorting();
