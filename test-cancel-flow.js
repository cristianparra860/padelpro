const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCancelFlow() {
  console.log('\n=== TEST DE FLUJO DE CANCELACIÓN ===\n');
  
  // 1. Crear una reserva de prueba
  console.log('1️⃣ Creando TimeSlot de prueba...');
  
  const testSlot = await prisma.timeSlot.create({
    data: {
      clubId: 'padel-estrella-madrid',
      instructorId: 'cmhkwmdc10005tgqw6fn129he',
      start: new Date('2025-11-16T10:00:00Z'),
      end: new Date('2025-11-16T11:00:00Z'),
      maxPlayers: 4,
      totalPrice: 25,
      instructorPrice: 10,
      courtRentalPrice: 15,
      level: 'ABIERTO',
      category: 'clases',
      courtId: 'cmhkwerqw0000tg1gqw0v944d', // Pista 1 asignada
      courtNumber: 1
    }
  });
  
  console.log(`✅ TimeSlot creado: ${testSlot.id}, Pista: ${testSlot.courtNumber}`);
  
  // 2. Crear una reserva
  console.log('\n2️⃣ Creando booking de prueba...');
  
  const testBooking = await prisma.booking.create({
    data: {
      userId: 'cmhkxdavq0009tgqw6h7m5jfe',
      timeSlotId: testSlot.id,
      groupSize: 1,
      status: 'CONFIRMED',
      amountBlocked: 2500
    }
  });
  
  console.log(`✅ Booking creado: ${testBooking.id}, Status: ${testBooking.status}`);
  
  // 3. Cancelar el booking (simulando el flujo del API)
  console.log('\n3️⃣ Cancelando booking...');
  
  await prisma.$executeRaw`
    UPDATE Booking 
    SET status = 'CANCELLED', updatedAt = datetime('now')
    WHERE id = ${testBooking.id}
  `;
  
  console.log('✅ Booking marcado como CANCELLED');
  
  // 4. Verificar bookings restantes
  console.log('\n4️⃣ Contando bookings restantes...');
  
  const remainingBookings = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM Booking
    WHERE timeSlotId = ${testSlot.id}
    AND status IN ('PENDING', 'CONFIRMED')
  `;
  
  console.log('Bookings restantes:', remainingBookings[0]);
  
  const hasRemainingBookings = remainingBookings[0]?.count > 0;
  
  if (!hasRemainingBookings) {
    console.log('\n5️⃣ No quedan bookings - Limpiando courtId...');
    
    await prisma.$executeRaw`
      UPDATE TimeSlot
      SET courtId = NULL, courtNumber = NULL, genderCategory = NULL, updatedAt = datetime('now')
      WHERE id = ${testSlot.id}
    `;
    
    console.log('✅ CourtId limpiado');
  } else {
    console.log('\n❌ ERROR: Todavía quedan bookings, no se debería limpiar');
  }
  
  // 6. Verificar estado final
  console.log('\n6️⃣ Verificando estado final...');
  
  const finalSlot = await prisma.timeSlot.findUnique({
    where: { id: testSlot.id },
    include: {
      bookings: true
    }
  });
  
  console.log('TimeSlot final:');
  console.log(`  - CourtId: ${finalSlot?.courtId}`);
  console.log(`  - CourtNumber: ${finalSlot?.courtNumber}`);
  console.log(`  - Total bookings: ${finalSlot?.bookings.length}`);
  finalSlot?.bookings.forEach(b => {
    console.log(`    - Booking ${b.id}: ${b.status}`);
  });
  
  // 7. Limpiar
  console.log('\n7️⃣ Limpiando datos de prueba...');
  await prisma.booking.deleteMany({ where: { timeSlotId: testSlot.id } });
  await prisma.timeSlot.delete({ where: { id: testSlot.id } });
  console.log('✅ Limpieza completada');
  
  await prisma.$disconnect();
}

testCancelFlow();
