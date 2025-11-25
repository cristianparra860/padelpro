const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check7AMCards() {
  try {
    // Tarjetas exactamente a las 06:00 UTC (7:00 España) del día 24
    const slots = await prisma.timeSlot.findMany({
      where: {
        start: new Date('2025-11-24T06:00:00.000Z'),
        courtId: null // Solo las disponibles
      },
      include: {
        instructor: {
          select: {
            name: true
          }
        },
        bookings: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED']
            }
          },
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        level: 'asc'
      }
    });

    console.log('\n🕐 TARJETAS A LAS 7:00 (06:00 UTC) - DÍA 24 NOV\n');
    console.log(`📊 Total: ${slots.length} tarjeta(s)\n`);

    // Agrupar por instructor
    const byInstructor = {};
    slots.forEach(slot => {
      const name = slot.instructor.name;
      if (!byInstructor[name]) {
        byInstructor[name] = [];
      }
      byInstructor[name].push(slot);
    });

    Object.entries(byInstructor).forEach(([instructor, cards]) => {
      console.log(`👨‍🏫 ${instructor}: ${cards.length} tarjeta(s)`);
      cards.forEach((card, idx) => {
        const bookingCount = card.bookings.length;
        const bookingInfo = card.bookings.map(b => 
          `${b.user.name} (${b.status})`
        ).join(', ');
        
        console.log(`   ${idx + 1}. ${card.level.padEnd(12)} | ${card.genderCategory.padEnd(10)} | ID: ${card.id.substring(0, 12)}...`);
        console.log(`      Reservas: ${bookingCount} ${bookingInfo ? `- ${bookingInfo}` : ''}`);
      });
      console.log('');
    });

    // Verificar si Carlos tiene duplicada
    const carlosCards = byInstructor['Carlos Martinez'] || [];
    if (carlosCards.length > 1) {
      console.log('✅ Carlos Martinez SÍ tiene tarjeta duplicada en el backend');
    } else {
      console.log('❌ Carlos Martinez NO tiene tarjeta duplicada en el backend');
    }

    console.log('\n════════════════════════════════════════════════');
    console.log(`\n💡 Si ves solo ${Object.keys(byInstructor).length} tarjetas en el frontend (1 por instructor),`);
    console.log('   pero el backend tiene más, entonces el frontend está filtrando.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check7AMCards();
