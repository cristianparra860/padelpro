// Test: Hacer una reserva nueva y ver si se crea tarjeta ABIERTO
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fetch = require('node-fetch');

async function testNewBooking() {
  try {
    console.log('\n🧪 TEST: Nueva reserva para verificar creación de tarjeta ABIERTO\n');
    console.log('='.repeat(70));
    
    // 1. Buscar una clase SIN reservas a partir del 1 de diciembre
    console.log('\n1️⃣ Buscando clase sin reservas desde el 1 de diciembre...');
    const dec1st = new Date('2025-12-01T00:00:00Z').getTime();
    console.log('   Buscando desde:', new Date(dec1st).toLocaleDateString());
    
    const availableSlots = await prisma.$queryRaw`
      SELECT ts.id, ts.start, ts.end, ts.level, ts.genderCategory, ts.instructorId,
             COUNT(b.id) as bookingCount
      FROM TimeSlot ts
      LEFT JOIN Booking b ON ts.id = b.timeSlotId AND b.status IN ('PENDING', 'CONFIRMED')
      WHERE ts.courtId IS NULL
      AND ts.start >= ${dec1st}
      AND ts.level = 'ABIERTO'
      GROUP BY ts.id
      HAVING bookingCount = 0
      ORDER BY ts.start
      LIMIT 1
    `;
    
    if (availableSlots.length === 0) {
      console.log('❌ No hay clases disponibles sin reservas');
      await prisma.$disconnect();
      return;
    }
    
    const slot = availableSlots[0];
    console.log('\n✅ Clase encontrada:');
    console.log('   ID:', slot.id);
    console.log('   Nivel:', slot.level);
    console.log('   Categoría:', slot.genderCategory);
    console.log('   Hora:', new Date(Number(slot.start)).toLocaleString());
    console.log('   Instructor:', slot.instructorId);
    
    // 2. Login con usuario de prueba
    console.log('\n2️⃣ Haciendo login...');
    const loginResponse = await fetch('http://localhost:9002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jugador2@padelpro.com', // Usar jugador2 para variar
        password: 'Pass123!'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Error en login');
      await prisma.$disconnect();
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login exitoso:', loginData.user.name);
    console.log('   User level:', loginData.user.level);
    console.log('   User gender:', loginData.user.gender);
    
    // 3. Hacer la reserva
    console.log('\n3️⃣ Haciendo reserva...');
    console.log('⏰ OBSERVA LOS LOGS DEL SERVIDOR AHORA:');
    console.log('   - Debe decir "🏷️ ===== FIRST BOOKING DETECTED ====="');
    console.log('   - Debe decir "✅ TimeSlot classified"');
    console.log('   - Debe decir "✅ New fully open slot created"');
    console.log('');
    
    const bookingResponse = await fetch('http://localhost:9002/api/classes/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({
        userId: loginData.user.id,
        timeSlotId: slot.id,
        groupSize: 1
      })
    });
    
    const bookingData = await bookingResponse.json();
    
    if (!bookingResponse.ok) {
      console.log('❌ Error en reserva:', bookingData.error);
      await prisma.$disconnect();
      return;
    }
    
    console.log('✅ Reserva creada:', bookingData.bookingId);
    
    // 4. Verificar cambios
    console.log('\n4️⃣ Verificando cambios en base de datos...');
    
    // Verificar TimeSlot original
    const updatedSlot = await prisma.timeSlot.findUnique({
      where: { id: slot.id }
    });
    
    console.log('\n📋 TimeSlot ORIGINAL (actualizado):');
    console.log('   Level:', updatedSlot.level);
    console.log('   Category:', updatedSlot.genderCategory);
    
    // Buscar tarjeta ABIERTO nueva
    const newOpenSlots = await prisma.timeSlot.findMany({
      where: {
        instructorId: slot.instructorId,
        start: updatedSlot.start,
        level: 'ABIERTO',
        genderCategory: 'mixto',
        courtId: null
      }
    });
    
    console.log('\n📋 Tarjetas ABIERTO encontradas:', newOpenSlots.length);
    if (newOpenSlots.length > 0) {
      newOpenSlots.forEach((s, i) => {
        console.log(`\n   Tarjeta ${i + 1}:`);
        console.log('   - ID:', s.id);
        console.log('   - Level:', s.level);
        console.log('   - Category:', s.genderCategory);
      });
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ TEST COMPLETADO');
    console.log('\n💡 Si NO ves logs del servidor con "FIRST BOOKING DETECTED",');
    console.log('   significa que isFirstBooking = false (había bookings previos)\n');
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

testNewBooking();
