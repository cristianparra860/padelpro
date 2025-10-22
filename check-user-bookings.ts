import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserBookings() {
  try {
    console.log('🔍 Verificando todas las reservas en la base de datos...\n');

    // Obtener TODAS las reservas sin filtros
    const allBookings = await prisma.booking.findMany({
      include: {
        timeSlot: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`📊 Total de reservas en DB: ${allBookings.length}\n`);

    if (allBookings.length === 0) {
      console.log('✅ La base de datos NO tiene ninguna reserva.\n');
    } else {
      console.log('⚠️ Reservas encontradas:\n');
      allBookings.forEach((booking, index) => {
        console.log(`${index + 1}. Booking ID: ${booking.id}`);
        console.log(`   Usuario: ${booking.user.name} (${booking.user.email})`);
        console.log(`   Status: ${booking.status}`);
        console.log(`   Tamaño grupo: ${booking.groupSize}`);
        console.log(`   TimeSlot: ${booking.timeSlot.start} - ${booking.timeSlot.end}`);
        console.log('');
      });
    }

    // Por estados
    const byStatus = await prisma.booking.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    console.log('📈 Reservas por estado:');
    byStatus.forEach(group => {
      console.log(`   ${group.status}: ${group._count.id}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserBookings();
