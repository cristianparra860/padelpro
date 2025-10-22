const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookings() {
  try {
    // Buscar el club Padel Estrella
    const club = await prisma.club.findFirst({
      where: { name: 'Padel Estrella' }
    });
    
    if (!club) {
      console.log('❌ Club Padel Estrella no encontrado');
      return;
    }
    
    console.log('🏢 Club:', club.name, 'ID:', club.id);
    
    // Buscar todas las bookings del club
    const bookings = await prisma.booking.findMany({
      where: {
        timeSlot: {
          clubId: club.id
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        timeSlot: {
          select: {
            start: true,
            end: true,
            level: true,
            category: true,
            totalPrice: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('📚 Total de bookings:', bookings.length);
    
    if (bookings.length > 0) {
      console.log('\n📋 Primeras 5 bookings:');
      bookings.slice(0, 5).forEach((b, i) => {
        const date = new Date(b.timeSlot.start).toLocaleDateString('es-ES');
        const time = new Date(b.timeSlot.start).toTimeString().substring(0,5);
        console.log(`  ${i+1}. ${b.user.name} - ${date} ${time} - ${b.status} - ${b.timeSlot.level}`);
      });
      
      // Contar por estado
      const confirmed = bookings.filter(b => b.status === 'CONFIRMED').length;
      const pending = bookings.filter(b => b.status === 'PENDING').length;
      const cancelled = bookings.filter(b => b.status === 'CANCELLED').length;
      
      console.log('\n📊 Bookings por estado:');
      console.log(`  ✅ Confirmadas: ${confirmed}`);
      console.log(`  ⏳ Pendientes: ${pending}`);
      console.log(`  ❌ Canceladas: ${cancelled}`);
    } else {
      console.log('\n❌ No hay bookings para Padel Estrella');
      console.log('💡 Necesitas crear algunas reservas primero');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookings();
