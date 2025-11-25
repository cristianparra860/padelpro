/**
 * Debug: Verificar que la página del calendario admin está cargando el usuario
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugCalendarPage() {
  console.log('\n🔍 DEBUG: CALENDARIO ADMIN - CARGA DE USUARIO\n');
  console.log('='.repeat(70));

  try {
    // Simular lo que hace /api/me
    const user = await prisma.user.findFirst({
      where: { email: 'alex@example.com' }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Nombre: ${user.name}`);
    console.log(`   Email: ${user.email}`);

    // Simular lo que hace /api/users/[userId]/bookings
    const bookings = await prisma.booking.findMany({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: {
        timeSlot: {
          include: {
            instructor: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\n📋 Bookings activos: ${bookings.length}`);

    if (bookings.length > 0) {
      console.log('\n📊 Formato que debería recibir DateSelector:');
      
      const formattedBookings = bookings.map(b => ({
        timeSlotId: b.timeSlotId,
        status: b.status,
        date: b.timeSlot.start
      }));

      // Mostrar primeros 5
      formattedBookings.slice(0, 5).forEach((b, idx) => {
        const date = new Date(b.date);
        const dateStr = date.toDateString();
        console.log(`   ${idx + 1}. ${dateStr} - ${b.status}`);
      });

      console.log('\n🎯 Días que DEBERÍAN mostrar indicadores:');
      
      // Agrupar por día
      const byDay = new Map();
      formattedBookings.forEach(b => {
        const dateStr = new Date(b.date).toDateString();
        if (!byDay.has(dateStr)) {
          byDay.set(dateStr, { confirmed: 0, pending: 0 });
        }
        const day = byDay.get(dateStr);
        if (b.status === 'CONFIRMED') day.confirmed++;
        else if (b.status === 'PENDING') day.pending++;
      });

      Array.from(byDay.entries()).forEach(([dateStr, counts]) => {
        const indicator = counts.confirmed > 0 ? '🔴 R' : '🔵 I';
        console.log(`   ${dateStr} ${indicator}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('🔍 VERIFICA EN LA CONSOLA DEL NAVEGADOR:');
    console.log('   1. Abre F12 en el navegador');
    console.log('   2. Ve a la pestaña Console');
    console.log('   3. Busca estos mensajes:');
    console.log('      - "📥 loadUserBookings: Cargando bookings..."');
    console.log('      - "✅ loadUserBookings: Bookings recibidos: X"');
    console.log('      - "📅 DateSelector - userBookings: X"');
    console.log('\n   Si NO ves estos mensajes, el problema es:');
    console.log('   ❌ La página no está cargando el currentUser');
    console.log('   ❌ O el useEffect no se está ejecutando');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCalendarPage();
