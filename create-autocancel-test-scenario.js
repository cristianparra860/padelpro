const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRealAutoCancelScenario() {
  try {
    console.log('\n🧪 CREANDO ESCENARIO DE PRUEBA: AUTO-CANCELACIÓN\n');
    
    // 1. Buscar usuario Marc
    const marc = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' },
      select: { id: true, name: true, email: true, credits: true }
    });
    
    if (!marc) {
      console.log('❌ Usuario Marc no encontrado');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`👤 Usuario: ${marc.name}`);
    console.log(`   Créditos: €${(Number(marc.credits)/100).toFixed(2)}\n`);
    
    // 2. Buscar clases del 18 de diciembre (mañana) para evitar conflictos
    const targetDate = '2025-12-18';
    const slots = await prisma.$queryRaw`
      SELECT id, start, instructorId
      FROM TimeSlot
      WHERE start LIKE '2025-12-18%'
      AND courtId IS NULL
      ORDER BY start
      LIMIT 3
    `;
    
    if (slots.length < 2) {
      console.log('❌ No hay suficientes clases disponibles el 18 de diciembre');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`📅 Clases disponibles el ${targetDate}:`);
    slots.forEach((s, i) => {
      const time = new Date(s.start).toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'});
      console.log(`   ${i+1}. ${time} (${s.id})`);
    });
    
    const slot1 = slots[0];
    const slot2 = slots[1];
    
    console.log(`\n📝 PASO 1: Marc se inscribe en la clase de ${new Date(slot1.start).toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'})}`);
    
    // Crear inscripción 1
    const booking1Id = `booking-test-${Date.now()}-1`;
    await prisma.$executeRaw`
      INSERT INTO Booking (id, userId, timeSlotId, groupSize, status, amountBlocked, paidWithPoints, pointsUsed, isRecycled, createdAt, updatedAt)
      VALUES (${booking1Id}, ${marc.id}, ${slot1.id}, 2, 'PENDING', 1000, 0, 0, 0, datetime('now'), datetime('now'))
    `;
    console.log(`   ✅ Inscripción creada: ${booking1Id}`);
    
    console.log(`\n📝 PASO 2: Marc se inscribe en la clase de ${new Date(slot2.start).toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'})}`);
    
    // Crear inscripción 2
    const booking2Id = `booking-test-${Date.now()}-2`;
    await prisma.$executeRaw`
      INSERT INTO Booking (id, userId, timeSlotId, groupSize, status, amountBlocked, paidWithPoints, pointsUsed, isRecycled, createdAt, updatedAt)
      VALUES (${booking2Id}, ${marc.id}, ${slot2.id}, 2, 'PENDING', 1000, 0, 0, 0, datetime('now'), datetime('now'))
    `;
    console.log(`   ✅ Inscripción creada: ${booking2Id}`);
    
    // Verificar estado actual
    console.log(`\n📊 ESTADO ACTUAL:`);
    const currentBookings = await prisma.$queryRaw`
      SELECT b.id, b.status, ts.start
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${marc.id}
      AND ts.start LIKE '2025-12-18%'
      ORDER BY ts.start
    `;
    currentBookings.forEach(b => {
      const time = new Date(b.start).toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'});
      console.log(`   ${b.status} - ${time}`);
    });
    
    console.log(`\n✅ ESCENARIO PREPARADO`);
    console.log(`\n📋 PRÓXIMO PASO MANUAL:`);
    console.log(`   1. Ir a la app y completar la clase de ${new Date(slot1.start).toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'})}`);
    console.log(`   2. Cuando se confirme, verificar en los logs del servidor que:`);
    console.log(`      - Se ejecuta "cancelOtherBookingsOnSameDay"`);
    console.log(`      - Se cancela automáticamente la inscripción de ${new Date(slot2.start).toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'})}`);
    console.log(`   3. Refrescar la página y verificar que solo aparece la clase confirmada\n`);
    
    console.log(`📝 IDs para seguimiento:`);
    console.log(`   Booking 1: ${booking1Id}`);
    console.log(`   Booking 2: ${booking2Id}`);
    console.log(`   Slot 1: ${slot1.id}`);
    console.log(`   Slot 2: ${slot2.id}\n`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

testRealAutoCancelScenario();
