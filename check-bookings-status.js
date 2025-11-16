// Verificar estado actual de reservas
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookingsStatus() {
  try {
    console.log('📊 Estado actual de las reservas:\n');
    
    // Contar reservas por estado
    const pending = await prisma.booking.count({ where: { status: 'PENDING' } });
    const confirmed = await prisma.booking.count({ where: { status: 'CONFIRMED' } });
    const cancelled = await prisma.booking.count({ where: { status: 'CANCELLED' } });
    
    console.log(`   PENDING: ${pending}`);
    console.log(`   CONFIRMED: ${confirmed}`);
    console.log(`   CANCELLED: ${cancelled}`);
    console.log(`   TOTAL: ${pending + confirmed + cancelled}\n`);
    
    // Obtener reservas activas (no canceladas)
    const activeBookings = await prisma.booking.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: {
        timeSlot: {
          select: {
            start: true,
            end: true,
            courtNumber: true,
            genderCategory: true
          }
        },
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    if (activeBookings.length > 0) {
      console.log('📋 Últimas 10 reservas activas:\n');
      activeBookings.forEach((booking, idx) => {
        console.log(`${idx + 1}. ${booking.user.name} - ${new Date(booking.timeSlot.start).toLocaleString('es-ES')}`);
        console.log(`   Status: ${booking.status}`);
        console.log(`   Pista: ${booking.timeSlot.courtNumber || 'Sin asignar'}`);
        console.log(`   Precio bloqueado: €${(booking.amountBlocked / 100).toFixed(2)}\n`);
      });
    } else {
      console.log('❌ No hay reservas activas\n');
    }
    
    // Ver clases confirmadas
    const confirmedClasses = await prisma.timeSlot.findMany({
      where: {
        courtNumber: { not: null }
      },
      select: {
        id: true,
        start: true,
        courtNumber: true,
        _count: {
          select: {
            bookings: {
              where: {
                status: { in: ['PENDING', 'CONFIRMED'] }
              }
            }
          }
        }
      },
      orderBy: {
        start: 'asc'
      },
      take: 10
    });
    
    console.log(`\n🏟️ Clases confirmadas (con pista asignada): ${confirmedClasses.length}\n`);
    confirmedClasses.forEach((cls, idx) => {
      console.log(`${idx + 1}. Pista ${cls.courtNumber} - ${new Date(cls.start).toLocaleString('es-ES')}`);
      console.log(`   Reservas activas: ${cls._count.bookings}\n`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookingsStatus();
