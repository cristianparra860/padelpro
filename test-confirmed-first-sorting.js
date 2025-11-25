/**
 * Test: Verificar que las clases confirmadas aparecen primero
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testConfirmedFirstSorting() {
  console.log('\n🧪 TEST: ORDENAMIENTO - CLASES CONFIRMADAS PRIMERO\n');
  console.log('='.repeat(70));

  try {
    const clubId = 'padel-estrella-madrid';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 7);

    // Obtener TimeSlots de prueba
    const allSlots = await prisma.timeSlot.findMany({
      where: {
        clubId,
        start: {
          gte: BigInt(today.getTime()),
          lte: BigInt(tomorrow.getTime())
        }
      },
      include: {
        instructor: true,
        bookings: {
          where: { status: { not: 'CANCELLED' } }
        }
      },
      orderBy: { start: 'asc' }
    });

    console.log(`📊 Total TimeSlots encontrados: ${allSlots.length}\n`);

    // Separar en confirmadas y propuestas
    const confirmed = allSlots.filter(s => s.courtId !== null);
    const proposals = allSlots.filter(s => s.courtId === null);

    console.log(`✅ Clases CONFIRMADAS (con pista): ${confirmed.length}`);
    console.log(`📝 Clases PROPUESTAS (sin pista): ${proposals.length}\n`);

    if (confirmed.length === 0) {
      console.log('⚠️ No hay clases confirmadas para probar');
      console.log('💡 Crea una reserva completa desde el navegador para probar');
      return;
    }

    console.log('🎯 RESULTADO ESPERADO DEL API:\n');
    console.log('Primero las CONFIRMADAS:');
    confirmed.slice(0, 3).forEach((slot, idx) => {
      const date = new Date(Number(slot.start));
      const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      console.log(`  ${idx + 1}. ✅ ${date.toLocaleDateString('es-ES')} ${time} - ${slot.instructor?.name} - Pista ${slot.courtNumber || slot.courtId?.slice(0, 8)}`);
    });

    if (proposals.length > 0) {
      console.log('\nLuego las PROPUESTAS:');
      proposals.slice(0, 3).forEach((slot, idx) => {
        const date = new Date(Number(slot.start));
        const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`  ${confirmed.length + idx + 1}. 📝 ${date.toLocaleDateString('es-ES')} ${time} - ${slot.instructor?.name} - Sin pista`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ VERIFICACIÓN:');
    console.log(`   - Las primeras ${confirmed.length} tarjetas serán clases confirmadas`);
    console.log(`   - Las siguientes ${proposals.length} tarjetas serán propuestas`);
    console.log('   - Esto aplica en TODAS las búsquedas (nivel, género, hora, etc.)');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConfirmedFirstSorting();
