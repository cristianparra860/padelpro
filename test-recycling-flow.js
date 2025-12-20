// Test completo del flujo de reciclaje de plazas
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRecyclingFlow() {
  try {
    console.log('\n🧪 === TEST COMPLETO: FLUJO DE RECICLAJE ===\n');

    // PASO 1: Encontrar o crear una clase confirmada
    console.log('📋 PASO 1: Buscando clase confirmada con reservas...\n');
    
    const confirmedClasses = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.courtId,
        ts.courtNumber,
        ts.maxPlayers,
        i.name as instructorName,
        COUNT(b.id) as bookingCount
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      LEFT JOIN Booking b ON ts.id = b.timeSlotId AND b.status = 'CONFIRMED'
      WHERE ts.courtId IS NOT NULL
        AND ts.start > ${Date.now()}
      GROUP BY ts.id
      HAVING COUNT(b.id) > 0
      ORDER BY ts.start
      LIMIT 1
    `;

    if (confirmedClasses.length === 0) {
      console.log('❌ No hay clases confirmadas con reservas. Necesitas crear una primero.\n');
      console.log('💡 Sugerencia: Reserva una clase desde el panel y completa el grupo\n');
      return;
    }

    const targetClass = confirmedClasses[0];
    const classStart = new Date(Number(targetClass.start));
    
    console.log('✅ Clase confirmada encontrada:');
    console.log(`   Instructor: ${targetClass.instructorName}`);
    console.log(`   Horario: ${classStart.toLocaleString('es-ES')}`);
    console.log(`   Pista: ${targetClass.courtNumber}`);
    console.log(`   Reservas: ${targetClass.bookingCount}`);
    console.log(`   ID: ${targetClass.id}\n`);

    // PASO 2: Ver bookings actuales
    console.log('📋 PASO 2: Verificando bookings actuales...\n');
    
    const bookings = await prisma.booking.findMany({
      where: { 
        timeSlotId: targetClass.id,
        status: 'CONFIRMED'
      },
      include: {
        user: {
          select: { id: true, name: true, credits: true, points: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Total de reservas confirmadas: ${bookings.length}\n`);
    bookings.forEach((b, idx) => {
      console.log(`${idx + 1}. ${b.user.name} - ${b.groupSize}p - €${Number(b.amountBlocked).toFixed(2)}`);
      console.log(`   ID: ${b.id}`);
      console.log(`   User ID: ${b.userId}`);
      console.log(`   Credits: €${b.user.credits}, Points: ${b.user.points}pts\n`);
    });

    if (bookings.length === 0) {
      console.log('❌ No hay bookings confirmados para cancelar\n');
      return;
    }

    const targetBooking = bookings[0];
    
    // PASO 3: Cancelar el booking (simular el endpoint)
    console.log('📋 PASO 3: Cancelando booking...\n');
    console.log(`Usuario: ${targetBooking.user.name}`);
    console.log(`Booking ID: ${targetBooking.id}`);
    console.log(`Monto bloqueado: €${Number(targetBooking.amountBlocked).toFixed(2)}`);
    console.log(`Points antes: ${targetBooking.user.points}pts\n`);

    // Marcar como cancelado y reciclado
    await prisma.$executeRaw`
      UPDATE Booking 
      SET status = 'CANCELLED', isRecycled = 1, updatedAt = datetime('now')
      WHERE id = ${targetBooking.id}
    `;

    console.log('✅ Booking marcado como CANCELLED e isRecycled=1\n');

    // Otorgar puntos de compensación
    const pointsToGrant = Math.floor(Number(targetBooking.amountBlocked));
    await prisma.$executeRaw`
      UPDATE User
      SET points = points + ${pointsToGrant}, updatedAt = datetime('now')
      WHERE id = ${targetBooking.userId}
    `;

    console.log(`✅ Otorgados ${pointsToGrant} puntos al usuario\n`);

    // PASO 4: Verificar el estado después de cancelar
    console.log('📋 PASO 4: Verificando estado después de cancelación...\n');

    const bookingAfter = await prisma.booking.findUnique({
      where: { id: targetBooking.id }
    });

    console.log('Estado del booking cancelado:');
    console.log(`   status: ${bookingAfter?.status}`);
    console.log(`   isRecycled: ${bookingAfter?.isRecycled}`);
    console.log(`   groupSize: ${bookingAfter?.groupSize}\n`);

    const userAfter = await prisma.user.findUnique({
      where: { id: targetBooking.userId },
      select: { points: true }
    });

    console.log(`Points del usuario después: ${userAfter?.points}pts\n`);

    // PASO 5: Verificar cómo aparece en la API
    console.log('📋 PASO 5: Verificando cómo se ve en API /timeslots...\n');

    const allBookingsForSlot = await prisma.booking.findMany({
      where: { timeSlotId: targetClass.id },
      include: {
        user: {
          select: { name: true }
        }
      }
    });

    console.log(`Total bookings en el slot: ${allBookingsForSlot.length}`);
    
    const activeBookings = allBookingsForSlot.filter(b => b.status !== 'CANCELLED');
    const recycledBookings = allBookingsForSlot.filter(b => b.status === 'CANCELLED' && b.isRecycled);
    const totalRecycledSpots = recycledBookings.reduce((sum, b) => sum + b.groupSize, 0);

    console.log(`   Bookings activos: ${activeBookings.length}`);
    console.log(`   Bookings reciclados: ${recycledBookings.length}`);
    console.log(`   Plazas recicladas disponibles: ${totalRecycledSpots}\n`);

    allBookingsForSlot.forEach((b, idx) => {
      const statusIcon = b.status === 'CANCELLED' ? '❌' : '✅';
      const recycledIcon = b.isRecycled ? '♻️' : '';
      console.log(`${idx + 1}. ${statusIcon} ${b.user.name} - ${b.groupSize}p - ${b.status} ${recycledIcon}`);
    });

    console.log('\n📊 CÁLCULO PARA API:');
    console.log(`   hasRecycledSlots: ${totalRecycledSpots > 0}`);
    console.log(`   availableRecycledSlots: ${totalRecycledSpots}`);
    console.log(`   recycledSlotsOnlyPoints: ${totalRecycledSpots > 0}\n`);

    // PASO 6: Verificar resultado esperado
    console.log('='.repeat(70));
    console.log('🎯 RESULTADO ESPERADO:\n');
    
    if (totalRecycledSpots > 0) {
      console.log(`✅ La clase DEBE mostrarse en panel principal con:`);
      console.log(`   - Badge 🎁 con "${totalRecycledSpots}p"`);
      console.log(`   - Pista ${targetClass.courtNumber} asignada`);
      console.log(`   - Solo reservable con PUNTOS\n`);
      console.log(`📱 Ve al panel principal y busca:`);
      console.log(`   Instructor: ${targetClass.instructorName}`);
      console.log(`   Hora: ${classStart.toLocaleTimeString('es-ES')}`);
      console.log(`   Pista: ${targetClass.courtNumber}\n`);
    } else {
      console.log(`❌ No hay plazas recicladas\n`);
    }

    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRecyclingFlow();
