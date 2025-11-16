const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateEstrellaPrices() {
  try {
    console.log('🔍 Buscando club Padel Estrella...');
    
    const club = await prisma.club.findFirst({
      where: {
        name: {
          contains: 'Estrella'
        }
      }
    });

    if (!club) {
      console.log('❌ Club no encontrado');
      return;
    }

    console.log(`✅ Club encontrado: ${club.name}`);
    console.log(`💰 Precio de alquiler de pista del club: €${club.courtRentalPrice}`);

    // Buscar todos los TimeSlots de este club
    const slots = await prisma.timeSlot.findMany({
      where: {
        clubId: club.id
      },
      select: {
        id: true,
        totalPrice: true,
        instructorPrice: true,
        courtRentalPrice: true
      }
    });

    console.log(`\n📊 TimeSlots encontrados: ${slots.length}`);

    // Actualizar cada slot con el nuevo precio de pista
    let updated = 0;
    for (const slot of slots) {
      const oldCourtPrice = slot.courtRentalPrice || 10;
      const newCourtPrice = club.courtRentalPrice;
      const instructorPrice = slot.instructorPrice || 15;
      const newTotalPrice = instructorPrice + newCourtPrice;

      if (oldCourtPrice !== newCourtPrice || slot.totalPrice !== newTotalPrice) {
        await prisma.timeSlot.update({
          where: { id: slot.id },
          data: {
            courtRentalPrice: newCourtPrice,
            totalPrice: newTotalPrice
          }
        });
        updated++;
      }
    }

    console.log(`\n✅ Actualizados ${updated} TimeSlots`);

    // Verificar algunos ejemplos
    const updatedSlots = await prisma.timeSlot.findMany({
      where: {
        clubId: club.id,
        start: {
          gte: new Date()
        }
      },
      select: {
        id: true,
        start: true,
        totalPrice: true,
        instructorPrice: true,
        courtRentalPrice: true
      },
      take: 5,
      orderBy: {
        start: 'asc'
      }
    });

    console.log('\n💰 Primeros 5 TimeSlots actualizados:');
    updatedSlots.forEach(slot => {
      const date = new Date(slot.start);
      console.log({
        fecha: date.toLocaleString('es-ES'),
        precioTotal: slot.totalPrice,
        precioInstructor: slot.instructorPrice,
        precioPista: slot.courtRentalPrice,
        calculado: slot.instructorPrice + slot.courtRentalPrice
      });
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateEstrellaPrices();
