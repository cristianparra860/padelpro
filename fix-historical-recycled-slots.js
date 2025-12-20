const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixHistoricalRecycledSlots() {
  console.log('🔧 Corrigiendo clases históricas con plazas recicladas...\n');

  try {
    // 1. Buscar todas las clases confirmadas (con courtNumber)
    const confirmedSlots = await prisma.timeSlot.findMany({
      where: {
        courtNumber: {
          not: null
        }
      },
      include: {
        bookings: true
      }
    });

    console.log(`📊 Total de clases confirmadas encontradas: ${confirmedSlots.length}\n`);

    let updatedCount = 0;
    let slotsWithRecycled = 0;

    for (const slot of confirmedSlots) {
      // Contar bookings por estado
      const cancelledBookings = slot.bookings.filter(b => b.status === 'CANCELLED');
      const activeBookings = slot.bookings.filter(b => b.status !== 'CANCELLED');
      
      const maxPlayers = Number(slot.maxPlayers || 4);
      const availableRecycledSlots = Math.max(0, maxPlayers - activeBookings.length);
      
      // Una clase tiene plazas recicladas si:
      // 1. Tiene courtNumber asignado (confirmada)
      // 2. Tiene bookings cancelados O simplemente tiene plazas vacías
      const hasCancelledBookings = cancelledBookings.length > 0;
      const hasEmptySlots = activeBookings.length < maxPlayers;
      const hasRecycledSlots = hasCancelledBookings || hasEmptySlots;

      // Solo actualizar si hay plazas disponibles y los valores no coinciden
      const needsUpdate = 
        availableRecycledSlots > 0 && (
          slot.hasRecycledSlots !== hasRecycledSlots ||
          slot.availableRecycledSlots !== availableRecycledSlots ||
          slot.recycledSlotsOnlyPoints !== true
        );

      if (needsUpdate) {
        const slotDate = new Date(slot.start);
        console.log(`🔄 Actualizando slot ${slot.id.substring(0, 12)}...`);
        console.log(`   📅 Fecha: ${slotDate.toLocaleString('es-ES')}`);
        console.log(`   🎾 Pista: ${slot.courtNumber}`);
        console.log(`   👥 Bookings: ${activeBookings.length} activos, ${cancelledBookings.length} cancelados`);
        console.log(`   ♻️ Plazas disponibles: ${availableRecycledSlots}/${maxPlayers}`);
        console.log(`   Antes: hasRecycled=${slot.hasRecycledSlots}, available=${slot.availableRecycledSlots}`);

        await prisma.timeSlot.update({
          where: { id: slot.id },
          data: {
            hasRecycledSlots: true,
            availableRecycledSlots: availableRecycledSlots,
            recycledSlotsOnlyPoints: true
          }
        });

        console.log(`   ✅ Actualizado: hasRecycled=true, available=${availableRecycledSlots}\n`);
        updatedCount++;
      }

      if (availableRecycledSlots > 0) {
        slotsWithRecycled++;
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`   - Total clases confirmadas: ${confirmedSlots.length}`);
    console.log(`   - Clases con plazas recicladas: ${slotsWithRecycled}`);
    console.log(`   - Clases actualizadas: ${updatedCount}`);
    console.log('\n✅ Proceso completado!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixHistoricalRecycledSlots();
