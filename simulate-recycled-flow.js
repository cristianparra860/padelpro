const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateRecycledSlotFlow() {
  console.log('\n🧪 SIMULACIÓN: CREAR Y CANCELAR BOOKING EN CLASE DE CARLOS\n');
  console.log('='.repeat(80));
  
  const timeSlotId = 'ts-1764308197680-dpjdjcrk1ah'; // Carlos Martinez 9:00 pista 1
  
  // Buscar ID de María García
  const maria = await prisma.user.findFirst({
    where: { email: 'jugador2@padelpro.com' },
    select: { id: true, name: true }
  });
  
  if (!maria) {
    console.log('❌ No se encontró usuario María García');
    await prisma.$disconnect();
    return;
  }
  
  const mariaUserId = maria.id;
  console.log(`\n👤 Usuario: ${maria.name} (${mariaUserId})\n`);
  
  try {
    // Paso 1: Verificar estado inicial
    console.log('\n📊 PASO 1: Estado inicial de la clase\n');
    
    const initialBookings = await prisma.$queryRaw`
      SELECT 
        b.id,
        b.status,
        b.groupSize,
        u.name as userName
      FROM Booking b
      LEFT JOIN User u ON b.userId = u.id
      WHERE b.timeSlotId = ${timeSlotId}
    `;
    
    console.log(`   Bookings actuales: ${initialBookings.length}`);
    initialBookings.forEach(b => {
      console.log(`   - ${b.userName}: ${b.groupSize} plaza(s) - ${b.status}`);
    });
    
    const activeBookings = initialBookings.filter(b => b.status !== 'CANCELLED');
    const occupied = activeBookings.reduce((sum, b) => sum + b.groupSize, 0);
    console.log(`   Plazas ocupadas: ${occupied}/4`);
    
    // Paso 2: Crear un nuevo booking de María para 2 plazas
    console.log('\n📝 PASO 2: Creando booking de María (2 plazas)...\n');
    
    const newBookingId = `booking-test-${Date.now()}`;
    
    await prisma.$executeRaw`
      INSERT INTO Booking (id, userId, timeSlotId, groupSize, status, amountBlocked, createdAt, updatedAt)
      VALUES (
        ${newBookingId},
        ${mariaUserId},
        ${timeSlotId},
        2,
        'CONFIRMED',
        5.0,
        ${Date.now()},
        ${Date.now()}
      )
    `;
    
    console.log(`   ✅ Booking creado: ${newBookingId}`);
    console.log('   Status: CONFIRMED (clase tiene pista asignada)');
    console.log('   groupSize: 2');
    
    // Verificar estado después de crear
    const afterCreate = await prisma.$queryRaw`
      SELECT 
        b.id,
        b.status,
        b.groupSize,
        u.name as userName
      FROM Booking b
      LEFT JOIN User u ON b.userId = u.id
      WHERE b.timeSlotId = ${timeSlotId}
    `;
    
    console.log(`\n   📊 Bookings totales: ${afterCreate.length}`);
    afterCreate.forEach(b => {
      console.log(`   - ${b.userName}: ${b.groupSize} plaza(s) - ${b.status}`);
    });
    
    const occupiedAfter = afterCreate.filter(b => b.status !== 'CANCELLED').reduce((sum, b) => sum + b.groupSize, 0);
    console.log(`   Plazas ocupadas: ${occupiedAfter}/4`);
    
    // Paso 3: Simular cancelación del endpoint
    console.log('\n❌ PASO 3: Cancelando booking de María...\n');
    
    // Marcar como CANCELLED e isRecycled
    await prisma.$executeRaw`
      UPDATE Booking 
      SET status = 'CANCELLED', isRecycled = 1, updatedAt = ${Date.now()}
      WHERE id = ${newBookingId}
    `;
    
    console.log('   ✅ Booking marcado como CANCELLED e isRecycled=true');
    
    // Marcar TimeSlot con hasRecycledSlots
    await prisma.$executeRaw`
      UPDATE TimeSlot
      SET hasRecycledSlots = 1
      WHERE id = ${timeSlotId}
    `;
    
    console.log('   ✅ TimeSlot marcado con hasRecycledSlots=true');
    
    // Paso 4: Verificar estado final
    console.log('\n📊 PASO 4: Estado final\n');
    
    const finalBookings = await prisma.$queryRaw`
      SELECT 
        b.id,
        b.status,
        b.isRecycled,
        b.groupSize,
        u.name as userName
      FROM Booking b
      LEFT JOIN User u ON b.userId = u.id
      WHERE b.timeSlotId = ${timeSlotId}
    `;
    
    console.log(`   Bookings totales: ${finalBookings.length}`);
    finalBookings.forEach(b => {
      const recycledBadge = b.isRecycled === 1 ? ' ♻️' : '';
      console.log(`   ${b.status === 'CANCELLED' ? '❌' : '✅'} ${b.userName}: ${b.groupSize} plaza(s) - ${b.status}${recycledBadge}`);
    });
    
    const activeFinal = finalBookings.filter(b => b.status !== 'CANCELLED');
    const occupiedFinal = activeFinal.reduce((sum, b) => sum + b.groupSize, 0);
    
    console.log(`\n   Plazas ocupadas: ${occupiedFinal}/4`);
    console.log(`   Plazas disponibles: ${4 - occupiedFinal}`);
    
    const timeSlot = await prisma.$queryRaw`
      SELECT hasRecycledSlots FROM TimeSlot WHERE id = ${timeSlotId}
    `;
    
    console.log(`   ♻️ hasRecycledSlots: ${timeSlot[0].hasRecycledSlots === 1 ? 'SÍ ✅' : 'NO ❌'}`);
    
    // Análisis final
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ ANÁLISIS FINAL:\n');
    
    const recycledBookings = finalBookings.filter(b => b.isRecycled === 1);
    const hasRecycledSlots = timeSlot[0].hasRecycledSlots === 1;
    
    if (recycledBookings.length > 0 && hasRecycledSlots) {
      console.log('   ✅ CORRECTO: Hay bookings reciclados y TimeSlot marcado');
      console.log('   ✅ El badge amarillo debería aparecer en frontend');
      console.log(`   ✅ ${4 - occupiedFinal} plaza(s) disponible(s) solo con puntos`);
    } else if (recycledBookings.length > 0 && !hasRecycledSlots) {
      console.log('   ❌ PROBLEMA: Bookings reciclados pero TimeSlot NO marcado');
    } else if (recycledBookings.length === 0 && hasRecycledSlots) {
      console.log('   ⚠️ INCONSISTENCIA: TimeSlot marcado pero no hay bookings reciclados');
    }
    
    console.log('\n💡 Para ver el badge amarillo en frontend:');
    console.log('   1. Refrescar la página (F5)');
    console.log('   2. Navegar al 9 de diciembre');
    console.log('   3. Buscar la clase de Carlos Martinez a las 9:00');
    console.log('   4. Debería mostrar: "♻️ 2 plaza(s) reciclada(s) - Solo con puntos"');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

simulateRecycledSlotFlow().catch(console.error);
