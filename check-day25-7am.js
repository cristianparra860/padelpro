const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDay25() {
  console.log('🔍 Verificando clases del día 25 de noviembre a las 7:00h...\n');
  
  // Buscar todas las tarjetas de las 7:00h del día 25
  const slots = await prisma.timeSlot.findMany({
    where: {
      start: {
        gte: new Date('2025-11-25T07:00:00.000Z'),
        lt: new Date('2025-11-25T08:00:00.000Z')
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
              email: true,
              level: true,
              gender: true
            }
          }
        }
      }
    },
    orderBy: [
      { instructor: { name: 'asc' } },
      { createdAt: 'asc' }
    ]
  });

  console.log(`📊 Total tarjetas encontradas a las 7:00h del día 25: ${slots.length}\n`);
  
  // Agrupar por instructor
  const byInstructor = {};
  slots.forEach(slot => {
    const instructorName = slot.instructor?.name || 'Sin instructor';
    if (!byInstructor[instructorName]) {
      byInstructor[instructorName] = [];
    }
    byInstructor[instructorName].push(slot);
  });

  Object.entries(byInstructor).forEach(([instructor, instructorSlots]) => {
    console.log(`👨‍🏫 ${instructor} - ${instructorSlots.length} tarjeta(s)`);
    
    instructorSlots.forEach((slot, i) => {
      console.log(`   ${i + 1}. ID: ${slot.id.substring(0, 22)}...`);
      console.log(`      Nivel: ${slot.level} | Categoría: ${slot.genderCategory || 'NULL'}`);
      console.log(`      Cancha: ${slot.courtNumber || 'SIN ASIGNAR'}`);
      console.log(`      Reservas: ${slot.bookings.length}`);
      
      if (slot.bookings.length > 0) {
        slot.bookings.forEach(b => {
          console.log(`        - ${b.user.name} (${b.user.level}/${b.user.gender || 'sin género'})`);
        });
      }
      
      console.log(`      Creada: ${slot.createdAt.toLocaleString('es-ES')}`);
    });
    console.log('');
  });

  await prisma.$disconnect();
}

checkDay25();
