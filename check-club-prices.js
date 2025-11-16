const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClubPrices() {
  try {
    const clubs = await prisma.club.findMany({
      where: {
        name: {
          contains: 'Estrella'
        }
      },
      select: {
        id: true,
        name: true,
        courtRentalPrice: true
      }
    });

    console.log('📊 Clubs encontrados:', JSON.stringify(clubs, null, 2));

    // Ahora verificar algunas TimeSlots de este club
    if (clubs.length > 0) {
      const clubId = clubs[0].id;
      console.log('\n🔍 Verificando TimeSlots del club:', clubId);
      
      const slots = await prisma.timeSlot.findMany({
        where: {
          clubId: clubId,
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

      console.log('\n💰 Primeras 5 TimeSlots (precios):');
      slots.forEach(slot => {
        const date = new Date(slot.start);
        console.log({
          id: slot.id.substring(0, 8),
          fecha: date.toLocaleString('es-ES'),
          precioTotal: slot.totalPrice,
          precioInstructor: slot.instructorPrice || 'N/A',
          precioPista: slot.courtRentalPrice || 'N/A'
        });
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClubPrices();
