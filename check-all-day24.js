const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllDay24() {
  console.log('🔍 Verificando TODAS las clases del día 24 de noviembre...\n');
  
  const slots = await prisma.timeSlot.findMany({
    where: {
      start: {
        gte: new Date('2025-11-24T00:00:00.000Z'),
        lt: new Date('2025-11-25T00:00:00.000Z')
      }
    },
    include: {
      instructor: {
        select: {
          name: true
        }
      },
      bookings: {
        where: {
          status: { in: ['PENDING', 'CONFIRMED'] }
        },
        include: {
          user: {
            select: {
              name: true,
              level: true,
              gender: true
            }
          }
        }
      }
    },
    orderBy: [
      { start: 'asc' },
      { createdAt: 'asc' }
    ]
  });

  console.log(`📊 Total de tarjetas del día 24: ${slots.length}\n`);
  
  // Agrupar por hora de inicio
  const byHour = {};
  slots.forEach(slot => {
    const hour = new Date(slot.start).getHours();
    if (!byHour[hour]) byHour[hour] = [];
    byHour[hour].push(slot);
  });

  Object.entries(byHour).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).forEach(([hour, hourSlots]) => {
    console.log(`⏰ Hora ${hour}:00 - ${hourSlots.length} tarjetas`);
    
    hourSlots.forEach((slot, i) => {
      console.log(`   ${i + 1}. ${slot.id.substring(0, 20)}...`);
      console.log(`      Instructor: ${slot.instructor?.name || 'N/A'}`);
      console.log(`      Nivel: ${slot.level} | Categoría: ${slot.genderCategory || 'NULL'}`);
      console.log(`      Reservas: ${slot.bookings.length}`);
      if (slot.bookings.length > 0) {
        slot.bookings.forEach(b => {
          console.log(`        - ${b.user.name} (${b.user.level}/${b.user.gender}) - groupSize: ${b.groupSize}`);
        });
      }
    });
    console.log('');
  });

  await prisma.$disconnect();
}

checkAllDay24();
