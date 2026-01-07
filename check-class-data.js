const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClassData() {
  try {
    console.log('🔍 Buscando clases de Pedro López el 8 de enero a las 09:30...\n');
    
    const classes = await prisma.timeSlot.findMany({
      where: {
        instructorId: {
          not: null
        },
        start: {
          gte: new Date('2026-01-08T08:30:00Z'),
          lte: new Date('2026-01-08T09:30:00Z')
        }
      },
      include: {
        instructor: {
          include: {
            user: true
          }
        },
        bookings: {
          where: {
            status: {
              in: ['CONFIRMED', 'PENDING']
            }
          },
          include: {
            user: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    console.log(`📋 Clases encontradas: ${classes.length}\n`);

    classes.forEach((cls, index) => {
      console.log(`\n━━━ CLASE ${index + 1} ━━━`);
      console.log(`ID: ${cls.id.substring(0, 20)}...`);
      console.log(`Instructor: ${cls.instructor?.user?.name || 'N/A'}`);
      console.log(`Hora: ${new Date(cls.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
      console.log(`Nivel: ${cls.levelRange || 'N/A'}`);
      console.log(`Categoría en DB: ${cls.genderCategory || 'NONE'}`);
      console.log(`Pista: ${cls.courtNumber || 'No asignada'}`);
      console.log(`Total precio: €${cls.totalPrice || 0}`);
      
      console.log(`\n👥 BOOKINGS (${cls.bookings.length}):`);
      cls.bookings.forEach((booking, idx) => {
        console.log(`  ${idx + 1}. ${booking.user.name}`);
        console.log(`     - Género usuario: ${booking.user.gender || 'NO DEFINIDO'}`);
        console.log(`     - Group size: ${booking.groupSize}`);
        console.log(`     - Status: ${booking.status}`);
        console.log(`     - Creado: ${new Date(booking.createdAt).toLocaleString('es-ES')}`);
      });
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkClassData();
