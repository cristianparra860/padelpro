const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createRecycledClassWithBookings() {
  console.log('🚀 Creando clase confirmada con plaza reciclada...\n');

  const clubId = 'padel-estrella-madrid';
  const instructorId = 'cmhkwmdc10005tgqw6fn129he'; // Carlos Martinez
  const courtId = 'cmhkwerqw0002tg1gjuibilfn'; // Pista 3
  const courtNumber = 3;
  
  // Fecha: Diciembre 9, 2025 a las 14:00 (1733756400000 ms)
  const classDate = new Date('2025-12-09T14:00:00.000Z');
  const classTimestamp = classDate.getTime();
  
  try {
    // 1. Crear TimeSlot CONFIRMADO (con courtNumber)
    const timeSlotId = `ts-demo-recycled-${Date.now()}`;
    
    // Calcular end time (60 min después)
    const endTimestamp = classTimestamp + (60 * 60 * 1000);
    const now = Date.now();
    
    await prisma.$executeRaw`
      INSERT INTO TimeSlot (
        id,
        start,
        end,
        maxPlayers,
        clubId,
        instructorId,
        courtId,
        courtNumber,
        hasRecycledSlots,
        availableRecycledSlots,
        recycledSlotsOnlyPoints,
        creditsCost,
        instructorPrice,
        courtRentalPrice,
        totalPrice,
        genderCategory,
        level,
        category,
        createdAt,
        updatedAt
      ) VALUES (
        ${timeSlotId},
        ${classTimestamp},
        ${endTimestamp},
        4,
        ${clubId},
        ${instructorId},
        ${courtId},
        ${courtNumber},
        1,
        2,
        1,
        50,
        20.0,
        10.0,
        30.0,
        'mixto',
        'abierto',
        'clase',
        ${now},
        ${now}
      )
    `;
    
    console.log(`✅ TimeSlot creado: ${timeSlotId}`);
    console.log(`   📅 Fecha: ${classDate.toLocaleString('es-ES')}`);
    console.log(`   🎾 Pista: ${courtNumber} (${courtId})`);
    console.log(`   ♻️ Plazas recicladas: 2`);
    
    // 2. Crear 2 bookings activos (CONFIRMED)
    const user1Id = 'user-1763677110798-mq6nvxq88'; // María García
    const user2Id = 'user-1763677110911-r0vj9bz6q'; // Ana Nueva
    
    const booking1Id = `bk-demo-${Date.now()}-1`;
    const booking2Id = `bk-demo-${Date.now()}-2`;
    const bookingTime = Date.now();
    
    await prisma.$executeRaw`
      INSERT INTO Booking (
        id,
        userId,
        timeSlotId,
        groupSize,
        status,
        isRecycled,
        pointsUsed,
        createdAt,
        updatedAt
      ) VALUES (
        ${booking1Id},
        ${user1Id},
        ${timeSlotId},
        1,
        'CONFIRMED',
        0,
        0,
        ${bookingTime},
        ${bookingTime}
      )
    `;
    
    await prisma.$executeRaw`
      INSERT INTO Booking (
        id,
        userId,
        timeSlotId,
        groupSize,
        status,
        isRecycled,
        pointsUsed,
        createdAt,
        updatedAt
      ) VALUES (
        ${booking2Id},
        ${user2Id},
        ${timeSlotId},
        1,
        'CONFIRMED',
        0,
        0,
        ${bookingTime},
        ${bookingTime}
      )
    `;
    
    console.log(`✅ Bookings creados: 2 activos`);
    
    // 3. Crear 2 bookings CANCELADOS/RECICLADOS (usando mismo usuario real)
    const cancelledUser1 = `bk-cancelled-${Date.now()}-1`;
    const cancelledUser2 = `bk-cancelled-${Date.now()}-2`;
    
    await prisma.$executeRaw`
      INSERT INTO Booking (
        id,
        userId,
        timeSlotId,
        groupSize,
        status,
        isRecycled,
        pointsUsed,
        createdAt,
        updatedAt
      ) VALUES (
        ${cancelledUser1},
        ${user1Id},
        ${timeSlotId},
        1,
        'CANCELLED',
        1,
        0,
        ${bookingTime},
        ${bookingTime}
      )
    `;
    
    await prisma.$executeRaw`
      INSERT INTO Booking (
        id,
        userId,
        timeSlotId,
        groupSize,
        status,
        isRecycled,
        pointsUsed,
        createdAt,
        updatedAt
      ) VALUES (
        ${cancelledUser2},
        ${user1Id},
        ${timeSlotId},
        1,
        'CANCELLED',
        1,
        0,
        ${bookingTime},
        ${bookingTime}
      )
    `;
    
    console.log(`♻️ Bookings cancelados/reciclados: 2`);
    
    console.log('\n🎉 ¡Clase demo creada exitosamente!');
    console.log('\n📋 Resumen:');
    console.log(`   - TimeSlot ID: ${timeSlotId}`);
    console.log(`   - Fecha: 9 de diciembre 2025, 14:00`);
    console.log(`   - Pista: ${courtNumber}`);
    console.log(`   - Estado: CONFIRMADA (courtNumber asignado)`);
    console.log(`   - Jugadores activos: 2/4`);
    console.log(`   - Plazas recicladas disponibles: 2`);
    console.log(`   - Solo con puntos: SÍ (50 puntos/plaza)`);
    console.log('\n✨ Esta clase DEBE mostrar el badge amarillo ♻️');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createRecycledClassWithBookings();
