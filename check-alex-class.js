// Verificar el estado de la clase de Alex García del 17 de diciembre
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAlexClass() {
  try {
    console.log('\n🔍 Verificando clase de Alex García - 17 Diciembre 09:00\n');

    // Buscar la clase de Alex del 17 de diciembre a las 9am
    const alexClasses = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.courtId,
        ts.courtNumber,
        ts.maxPlayers,
        i.name as instructorName
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      WHERE i.name LIKE '%Alex%'
        AND ts.start >= ${new Date('2025-12-17T08:00:00Z').getTime()}
        AND ts.start < ${new Date('2025-12-17T10:00:00Z').getTime()}
      ORDER BY ts.start
      LIMIT 5
    `;

    if (alexClasses.length === 0) {
      console.log('❌ No se encontró la clase de Alex García');
      return;
    }

    console.log(`✅ Encontradas ${alexClasses.length} clases de Alex:\n`);
    alexClasses.forEach((cls, idx) => {
      const start = new Date(Number(cls.start));
      console.log(`${idx + 1}. ${cls.instructorName} - ${start.toLocaleString('es-ES')} - Pista ${cls.courtNumber || 'sin asignar'}`);
      console.log(`   ID: ${cls.id}`);
    });

    const targetClass = alexClasses[0];
    console.log(`\n📍 ANALIZANDO CLASE: ${targetClass.id}\n`);

    // Ver todos los bookings de esta clase
    const allBookings = await prisma.booking.findMany({
      where: { timeSlotId: targetClass.id },
      include: {
        user: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`📊 BOOKINGS (${allBookings.length} total):\n`);
    allBookings.forEach((b, idx) => {
      const statusIcon = b.status === 'CANCELLED' ? '❌' : b.status === 'CONFIRMED' ? '✅' : '⏳';
      const recycledIcon = b.isRecycled ? '♻️' : '';
      console.log(`${idx + 1}. ${statusIcon} ${b.user.name} - ${b.groupSize}p - ${b.status} ${recycledIcon}`);
      console.log(`   ID: ${b.id}`);
      console.log(`   isRecycled: ${b.isRecycled}`);
      console.log(`   amountBlocked: €${Number(b.amountBlocked).toFixed(2)}`);
    });

    // Calcular estadísticas
    const activeBookings = allBookings.filter(b => b.status !== 'CANCELLED');
    const recycledBookings = allBookings.filter(b => b.status === 'CANCELLED' && b.isRecycled);
    const totalRecycledSpots = recycledBookings.reduce((sum, b) => sum + b.groupSize, 0);
    const occupiedSpots = activeBookings.reduce((sum, b) => sum + b.groupSize, 0);

    console.log(`\n📈 RESUMEN:`);
    console.log(`   Capacidad total: ${targetClass.maxPlayers} jugadores`);
    console.log(`   Plazas ocupadas: ${occupiedSpots}`);
    console.log(`   Bookings activos: ${activeBookings.length}`);
    console.log(`   Bookings reciclados: ${recycledBookings.length}`);
    console.log(`   Plazas recicladas disponibles: ${totalRecycledSpots}`);

    console.log(`\n🎯 RESULTADO ESPERADO:`);
    if (totalRecycledSpots > 0) {
      console.log(`   ✅ Debería aparecer badge 🎁 con "${totalRecycledSpots}p"`);
      console.log(`   ✅ Solo reservable con PUNTOS`);
    } else {
      console.log(`   ℹ️ NO debería aparecer badge (sin plazas recicladas)`);
    }

    console.log(`\n🐛 DEBUG - ¿Por qué no aparece el badge?`);
    console.log(`   1. Verifica hasRecycledSlots en TimeSlot`);
    console.log(`   2. Verifica que isRecycled=1 en bookings cancelados`);
    console.log(`   3. Verifica que API /timeslots devuelva availableRecycledSlots > 0`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAlexClass();
