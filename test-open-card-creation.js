// Script para verificar la creación automática de tarjeta ABIERTA
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOpenCardCreation() {
  try {
    console.log('\n🧪 TEST: Creación automática de tarjeta ABIERTA\n');
    console.log('='.repeat(70));
    
    // 1. Buscar una clase sin reservas (propuesta)
    console.log('\n1️⃣ Buscando clase disponible sin reservas...');
    const availableSlots = await prisma.$queryRaw`
      SELECT ts.id, ts.start, ts.end, ts.level, ts.genderCategory, ts.courtId,
             COUNT(b.id) as bookingCount
      FROM TimeSlot ts
      LEFT JOIN Booking b ON ts.id = b.timeSlotId AND b.status IN ('PENDING', 'CONFIRMED')
      WHERE ts.courtId IS NULL
      AND ts.start >= ${Date.now()}
      GROUP BY ts.id
      HAVING bookingCount = 0
      ORDER BY ts.start
      LIMIT 5
    `;
    
    if (availableSlots.length === 0) {
      console.log('❌ No hay clases disponibles sin reservas');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`✅ Encontradas ${availableSlots.length} clases sin reservas`);
    const testSlot = availableSlots[0];
    console.log('\n📋 Clase seleccionada para prueba:');
    console.log('   ID:', testSlot.id);
    console.log('   Nivel actual:', testSlot.level || 'NULL');
    console.log('   Categoría actual:', testSlot.genderCategory || 'NULL');
    console.log('   Horario:', new Date(Number(testSlot.start)).toLocaleString());
    
    // 2. Obtener un usuario para hacer la reserva
    console.log('\n2️⃣ Obteniendo usuario de prueba...');
    const testUser = await prisma.user.findFirst({
      where: { 
        email: 'jugador1@padelpro.com' 
      }
    });
    
    if (!testUser) {
      console.log('❌ Usuario de prueba no encontrado');
      await prisma.$disconnect();
      return;
    }
    
    console.log('✅ Usuario encontrado:');
    console.log('   Nombre:', testUser.name);
    console.log('   Nivel:', testUser.level);
    console.log('   Género:', testUser.gender);
    
    // 3. Hacer la reserva usando la API
    console.log('\n3️⃣ Haciendo reserva (primera en esta clase)...');
    console.log('   TimeSlotId:', testSlot.id);
    console.log('   UserId:', testUser.id);
    console.log('   GroupSize: 1');
    
    // Simular el comportamiento de la API
    const fetch = require('node-fetch');
    
    // Primero hacer login
    const loginResponse = await fetch('http://localhost:9002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: 'Pass123!'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Error en login');
      await prisma.$disconnect();
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    // Hacer la reserva
    const bookingResponse = await fetch('http://localhost:9002/api/classes/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: testUser.id,
        timeSlotId: testSlot.id,
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
    
    // 4. Verificar cambios en el TimeSlot original
    console.log('\n4️⃣ Verificando cambios en TimeSlot original...');
    const updatedSlot = await prisma.timeSlot.findUnique({
      where: { id: testSlot.id }
    });
    
    console.log('📊 TimeSlot original después de reserva:');
    console.log('   Nivel:', updatedSlot.level);
    console.log('   Categoría:', updatedSlot.genderCategory);
    console.log('   Nivel esperado:', testUser.level?.toUpperCase() || 'ABIERTO');
    console.log('   Categoría esperada:', testUser.gender === 'masculino' ? 'masculino' : 'femenino');
    
    // 5. Buscar la tarjeta ABIERTA nueva
    console.log('\n5️⃣ Buscando tarjeta ABIERTA creada automáticamente...');
    const openSlots = await prisma.$queryRaw`
      SELECT id, start, end, level, genderCategory, instructorId, courtId
      FROM TimeSlot
      WHERE instructorId = ${updatedSlot.instructorId}
      AND start = ${updatedSlot.start}
      AND level = 'ABIERTO'
      AND genderCategory = 'mixto'
      AND courtId IS NULL
    `;
    
    console.log('\n📋 RESULTADO:');
    console.log('─'.repeat(70));
    
    if (openSlots.length > 0) {
      console.log('✅✅✅ ÉXITO: Tarjeta ABIERTA creada automáticamente');
      console.log('\n   Tarjetas encontradas:', openSlots.length);
      openSlots.forEach((slot, i) => {
        console.log(`\n   Tarjeta ${i + 1}:`);
        console.log('   - ID:', slot.id);
        console.log('   - Nivel:', slot.level);
        console.log('   - Categoría:', slot.genderCategory);
        console.log('   - Horario:', new Date(Number(slot.start)).toLocaleString());
      });
      
      console.log('\n🏁 COMPETENCIA ACTIVA:');
      console.log(`   [${updatedSlot.level}/${updatedSlot.genderCategory}] vs [ABIERTO/mixto]`);
      
    } else {
      console.log('❌❌❌ ERROR: NO se creó la tarjeta ABIERTA');
      console.log('\n   Buscando con criterios más amplios...');
      
      const allSlotsAtTime = await prisma.$queryRaw`
        SELECT id, level, genderCategory
        FROM TimeSlot
        WHERE instructorId = ${updatedSlot.instructorId}
        AND start = ${updatedSlot.start}
        AND courtId IS NULL
      `;
      
      console.log(`\n   Tarjetas encontradas para este instructor/hora: ${allSlotsAtTime.length}`);
      allSlotsAtTime.forEach((slot, i) => {
        console.log(`   ${i + 1}. ID: ${slot.id}, Nivel: ${slot.level}, Categoría: ${slot.genderCategory}`);
      });
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

testOpenCardCreation();
