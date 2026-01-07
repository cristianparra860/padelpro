const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Importar la función de precios (simulada aquí)
async function getCourtPriceForTime(clubId, datetime) {
  const priceSlots = await prisma.courtPriceSlot.findMany({
    where: { clubId, isActive: true },
    orderBy: { priority: 'desc' }
  });

  const dayOfWeek = datetime.getUTCDay();
  const timeString = datetime.toISOString().substring(11, 16);

  for (const slot of priceSlots) {
    const daysArray = JSON.parse(slot.daysOfWeek);
    if (daysArray.includes(dayOfWeek)) {
      if (timeString >= slot.startTime && timeString < slot.endTime) {
        return slot.price;
      }
    }
  }

  const club = await prisma.club.findUnique({
    where: { id: clubId }
  });

  return club?.courtRentalPrice || 10;
}

// Calcular precio proporcional a la duración
function calculateProportionalPrice(pricePerHour, durationMinutes) {
  return pricePerHour * (durationMinutes / 60);
}

async function actualizarPreciosPartidas() {
  console.log('🔄 ACTUALIZANDO PRECIOS DE PARTIDAS DEL 8 DE ENERO\n');
  console.log('='.repeat(70));

  try {
    // Buscar todas las partidas del 8 de enero de 2026
    const startDate = new Date('2026-01-08T00:00:00.000Z');
    const endDate = new Date('2026-01-08T23:59:59.999Z');

    const matchGames = await prisma.matchGame.findMany({
      where: {
        start: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { start: 'asc' }
    });

    console.log(`\n📋 Encontradas ${matchGames.length} partidas del 8 de enero`);

    if (matchGames.length === 0) {
      console.log('⚠️ No hay partidas para actualizar');
      return;
    }

    console.log('\n🔧 Actualizando precios según franjas horarias y duración...\n');

    let updated = 0;
    const cambios = [];

    for (const match of matchGames) {
      const precioAnterior = match.courtRentalPrice;
      const precioHora = await getCourtPriceForTime(match.clubId, match.start);
      const precioNuevo = calculateProportionalPrice(precioHora, match.duration);

      if (Math.abs(precioAnterior - precioNuevo) > 0.01) { // Evitar diferencias de redondeo
        await prisma.matchGame.update({
          where: { id: match.id },
          data: { courtRentalPrice: precioNuevo }
        });

        const hora = match.start.toISOString().substring(11, 16);
        cambios.push({
          hora,
          duracion: match.duration,
          precioAnterior,
          precioNuevo
        });

        updated++;
      }
    }

    console.log('='.repeat(70));
    console.log(`\n✅ Actualización completada:`);
    console.log(`   Total partidas: ${matchGames.length}`);
    console.log(`   Actualizadas: ${updated}`);
    console.log(`   Sin cambios: ${matchGames.length - updated}\n`);

    if (cambios.length > 0) {
      console.log('📊 CAMBIOS REALIZADOS:\n');
      cambios.forEach(cambio => {
        const diferencia = cambio.precioNuevo - cambio.precioAnterior;
        const signo = diferencia > 0 ? '+' : '';
        console.log(`   ${cambio.hora} (${cambio.duracion}min): €${cambio.precioAnterior.toFixed(2)} → €${cambio.precioNuevo.toFixed(2)} (${signo}€${diferencia.toFixed(2)})`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('💡 Recarga la página del calendario para ver los cambios');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

actualizarPreciosPartidas();
