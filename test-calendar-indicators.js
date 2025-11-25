/**
 * Test: Verificar que hay bookings para mostrar indicadores en calendario admin
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCalendarIndicators() {
  console.log('\n🧪 TEST: VERIFICAR INDICADORES DE CALENDARIO ADMIN\n');
  console.log('='.repeat(70));

  try {
    // 1. Buscar usuario Alex
    const user = await prisma.user.findFirst({
      where: { email: 'alex@example.com' }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log(`✅ Usuario: ${user.name} (${user.id})`);

    // 2. Buscar bookings del usuario (próximos 30 días)
    const now = Date.now();
    const in30Days = now + (30 * 24 * 60 * 60 * 1000);

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
      },
      take: 10
    });

    console.log(`\n📋 Bookings encontrados: ${bookings.length}\n`);

    if (bookings.length === 0) {
      console.log('⚠️ No hay bookings para mostrar indicadores');
      console.log('💡 Crea una reserva desde el navegador para probar los indicadores');
      return;
    }

    // Agrupar por día y estado
    const byDay = new Map();

    bookings.forEach(booking => {
      const date = new Date(booking.timeSlot.start);
      const dateKey = date.toDateString();
      
      if (!byDay.has(dateKey)) {
        byDay.set(dateKey, {
          date: dateKey,
          dateObj: date,
          pending: [],
          confirmed: []
        });
      }

      const dayData = byDay.get(dateKey);
      if (booking.status === 'CONFIRMED') {
        dayData.confirmed.push(booking);
      } else if (booking.status === 'PENDING') {
        dayData.pending.push(booking);
      }
    });

    // Mostrar resumen de días
    console.log('📅 DÍAS CON BOOKINGS:\n');

    Array.from(byDay.values())
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .forEach((dayData, idx) => {
        const hasConfirmed = dayData.confirmed.length > 0;
        const hasPending = dayData.pending.length > 0;
        
        const indicator = hasConfirmed ? '🔴 R' : hasPending ? '🔵 I' : '';
        const label = hasConfirmed ? 'Reserva Confirmada' : 'Inscripción Pendiente';
        
        console.log(`${idx + 1}. ${dayData.date} ${indicator}`);
        console.log(`   Estado: ${label}`);
        console.log(`   Confirmados: ${dayData.confirmed.length}, Pendientes: ${dayData.pending.length}`);
        
        if (hasConfirmed) {
          dayData.confirmed.forEach(b => {
            const time = new Date(b.timeSlot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            console.log(`     - ${time} con ${b.timeSlot.instructor?.name || 'instructor'}`);
          });
        } else if (hasPending) {
          dayData.pending.forEach(b => {
            const time = new Date(b.timeSlot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            console.log(`     - ${time} con ${b.timeSlot.instructor?.name || 'instructor'}`);
          });
        }
        console.log('');
      });

    console.log('='.repeat(70));
    console.log('✅ RESULTADO:');
    console.log(`   Total días con actividad: ${byDay.size}`);
    console.log(`   - Estos días mostrarán indicadores R o I en el calendario admin`);
    console.log(`   - R (rojo) = Reserva confirmada`);
    console.log(`   - I (azul) = Inscripción pendiente`);

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCalendarIndicators();
