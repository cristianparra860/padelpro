const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClasses() {
  console.log('🔍 Verificando clases de las 7:00h del día 24 de noviembre...\n');
  
  // Buscar todas las tarjetas que empiecen entre 7:00 y 8:00 del 24 de noviembre
  const slots = await prisma.timeSlot.findMany({
    where: {
      start: {
        gte: new Date('2025-11-24T07:00:00.000Z'),
        lt: new Date('2025-11-24T08:00:00.000Z')
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
              email: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log(`📊 Total de tarjetas encontradas: ${slots.length}\n`);
  
  slots.forEach((slot, i) => {
    console.log(`${i + 1}. ID: ${slot.id}`);
    console.log(`   Instructor: ${slot.instructor?.name || 'N/A'}`);
    console.log(`   Nivel: ${slot.level}`);
    console.log(`   Categoría: ${slot.genderCategory || 'NULL'}`);
    console.log(`   Reservas activas: ${slot.bookings.length}`);
    if (slot.bookings.length > 0) {
      slot.bookings.forEach(b => {
        console.log(`     - ${b.user.name} (${b.user.email}) - groupSize: ${b.groupSize}`);
      });
    }
    console.log(`   Creada: ${slot.createdAt.toLocaleString('es-ES')}`);
    console.log('');
  });

  // Contar por nivel
  const byLevel = {};
  slots.forEach(s => {
    byLevel[s.level] = (byLevel[s.level] || 0) + 1;
  });

  console.log('📈 Resumen por nivel:');
  Object.entries(byLevel).forEach(([level, count]) => {
    console.log(`   ${level}: ${count} tarjetas`);
  });

  await prisma.$disconnect();
}

checkClasses();
