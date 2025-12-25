/**
 * Test del flujo completo de subsidio del instructor:
 * 1. Crear TimeSlot con 1 booking de 1 plaza (falta 1 para completar modalidad de 2)
 * 2. Instructor convierte última plaza a puntos
 * 3. Sistema crea booking del instructor y asigna pista
 * 4. Usuario reserva esa plaza con puntos
 * 5. Sistema reemplaza booking del instructor y devuelve créditos
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testInstructorSubsidyFlow() {
  console.log('\n🎯 === TEST FLUJO SUBSIDIO DEL INSTRUCTOR ===\n');

  try {
    // Limpiar datos de prueba previos
    console.log('🧹 Limpiando datos de prueba previos...');
    await prisma.$executeRaw`DELETE FROM Booking WHERE userId LIKE 'test-%'`;
    await prisma.$executeRaw`DELETE FROM TimeSlot WHERE id LIKE 'test-slot-%'`;
    await prisma.$executeRaw`DELETE FROM User WHERE id LIKE 'test-%'`;
    
    // Paso 0: Crear usuarios de prueba
    console.log('\n📝 Paso 0: Creando usuarios de prueba...');
    const testUserId = 'test-user-001';
    const testInstructorId = 'test-instructor-001';
    
    await prisma.$executeRaw`
      INSERT INTO User (id, email, name, role, credits, points, level, createdAt, updatedAt)
      VALUES (
        ${testUserId}, 
        'testuser@test.com', 
        'Test User', 
        'ALUMNO', 
        0, 
        1000, 
        2.5,
        datetime('now'), 
        datetime('now')
      )
    `;
    
    await prisma.$executeRaw`
      INSERT INTO User (id, email, name, role, credits, points, level, createdAt, updatedAt)
      VALUES (
        ${testInstructorId}, 
        'testinstructor@test.com', 
        'Test Instructor', 
        'INSTRUCTOR', 
        50000, 
        0,
        5.0,
        datetime('now'), 
        datetime('now')
      )
    `;
    
    console.log('✅ Usuarios creados');
    console.log(`   👤 Usuario: ${testUserId} (1000 puntos)`);
    console.log(`   👨‍🏫 Instructor: ${testInstructorId} (500€ en créditos)`);

    // Obtener datos reales del club y pista
    const clubs = await prisma.$queryRaw`SELECT id FROM Club LIMIT 1`;
    const clubId = clubs[0].id;
    
    const instructors = await prisma.$queryRaw`
      SELECT id FROM User WHERE role = 'INSTRUCTOR' AND id != ${testInstructorId} LIMIT 1
    `;
    const realInstructorId = instructors[0]?.id || testInstructorId;
    
    // Paso 1: Crear TimeSlot con 1 booking existente
    console.log('\n📝 Paso 1: Creando TimeSlot con 1 booking de 1 plaza...');
    const testSlotId = 'test-slot-subsidy-001';
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Mañana
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // +30 min
    
    await prisma.$executeRaw`
      INSERT INTO TimeSlot (
        id, clubId, instructorId, start, end, 
        totalPrice, level, levelRange, genderCategory,
        createdAt, updatedAt
      ) VALUES (
        ${testSlotId},
        ${clubId},
        ${realInstructorId},
        ${startTime.toISOString()},
        ${endTime.toISOString()},
        20.0,
        'intermedio',
        '2-3',
        'mixto',
        datetime('now'),
        datetime('now')
      )
    `;
    
    // Crear booking existente de modalidad 2 (falta 1 plaza)
    const existingBookingId = 'test-booking-existing-001';
    await prisma.$executeRaw`
      INSERT INTO Booking (
        id, userId, timeSlotId, groupSize, status,
        amountBlocked, paidWithPoints, createdAt, updatedAt
      ) VALUES (
        ${existingBookingId},
        'test-existing-user',
        ${testSlotId},
        2,
        'PENDING',
        1000,
        0,
        datetime('now'),
        datetime('now')
      )
    `;
    
    console.log('✅ TimeSlot creado con 1 booking de 2 plazas');
    console.log(`   🎫 Slot: ${testSlotId}`);
    console.log(`   📅 Horario: ${startTime.toLocaleString()}`);
    console.log(`   💰 Precio total: 20€`);
    console.log(`   📊 Estado: 1 booking de 2 plazas (falta 1 plaza para completar)`);

    // Verificar estado actual
    const currentBookings = await prisma.$queryRaw`
      SELECT groupSize, COUNT(*) as count 
      FROM Booking 
      WHERE timeSlotId = ${testSlotId} 
      AND status IN ('PENDING', 'CONFIRMED')
      GROUP BY groupSize
    `;
    console.log('   📊 Bookings actuales:', currentBookings);

    // Paso 2: Convertir última plaza a puntos (simulando endpoint)
    console.log('\n📝 Paso 2: Instructor convierte última plaza (índice 1) a puntos...');
    
    const response = await fetch('http://localhost:9002/api/timeslots/' + testSlotId + '/credits-slots', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add',
        slotIndex: 1,
        instructorId: realInstructorId
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error en conversión: ${response.status} - ${error}`);
    }
    
    const conversionResult = await response.json();
    console.log('✅ Conversión exitosa:', conversionResult);

    // Verificar que se creó el booking del instructor
    const instructorBooking = await prisma.$queryRaw`
      SELECT * FROM Booking 
      WHERE timeSlotId = ${testSlotId}
      AND isInstructorSubsidy = 1
      LIMIT 1
    `;
    
    if (instructorBooking.length > 0) {
      console.log('✅ Booking del instructor creado:');
      console.log(`   📝 ID: ${instructorBooking[0].id}`);
      console.log(`   👤 Usuario: ${instructorBooking[0].userId}`);
      console.log(`   💰 Monto bloqueado: ${instructorBooking[0].amountBlocked} céntimos`);
      console.log(`   ✅ Estado: ${instructorBooking[0].status}`);
    } else {
      console.log('❌ NO se creó el booking del instructor');
    }

    // Verificar si se asignó pista
    const updatedSlot = await prisma.$queryRaw`
      SELECT courtNumber, courtId FROM TimeSlot WHERE id = ${testSlotId}
    `;
    
    if (updatedSlot[0]?.courtNumber) {
      console.log('✅ Pista asignada:');
      console.log(`   🎾 Pista: ${updatedSlot[0].courtNumber}`);
      console.log(`   🆔 Court ID: ${updatedSlot[0].courtId}`);
    } else {
      console.log('⚠️ NO se asignó pista automáticamente');
    }

    // Verificar créditos del instructor
    const instructorAfter = await prisma.$queryRaw`
      SELECT credits FROM User WHERE id = ${realInstructorId}
    `;
    console.log(`   💰 Créditos instructor después: ${instructorAfter[0].credits} céntimos`);

    // Paso 3: Usuario reserva la plaza con puntos
    console.log('\n📝 Paso 3: Usuario reserva la plaza convertida con puntos...');
    
    const bookingResponse = await fetch('http://localhost:9002/api/classes/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        timeSlotId: testSlotId,
        groupSize: 1,
        usePoints: true
      })
    });
    
    if (!bookingResponse.ok) {
      const error = await bookingResponse.text();
      console.log('❌ Error en reserva:', error);
    } else {
      const bookingResult = await bookingResponse.json();
      console.log('✅ Reserva exitosa:', bookingResult);
    }

    // Verificar estado final
    console.log('\n📊 === ESTADO FINAL ===');
    
    const finalBookings = await prisma.$queryRaw`
      SELECT 
        id, userId, groupSize, status, 
        isInstructorSubsidy, amountBlocked, paidWithPoints
      FROM Booking 
      WHERE timeSlotId = ${testSlotId}
      ORDER BY createdAt
    `;
    
    console.log('\n📝 Todos los bookings:');
    finalBookings.forEach((b, i) => {
      console.log(`   ${i + 1}. ${b.id.substring(0, 20)}...`);
      console.log(`      Usuario: ${b.userId.substring(0, 20)}`);
      console.log(`      GroupSize: ${b.groupSize}`);
      console.log(`      Estado: ${b.status}`);
      console.log(`      Subsidio instructor: ${b.isInstructorSubsidy === 1 ? 'SÍ' : 'NO'}`);
      console.log(`      Pagado con puntos: ${b.paidWithPoints === 1 ? 'SÍ' : 'NO'}`);
      console.log(`      Monto: ${b.amountBlocked} céntimos\n`);
    });

    // Verificar que booking del instructor fue cancelado
    const cancelledInstructorBooking = finalBookings.find(
      b => b.isInstructorSubsidy === 1 && b.status === 'CANCELLED'
    );
    
    if (cancelledInstructorBooking) {
      console.log('✅ Booking del instructor fue CANCELADO correctamente');
    } else {
      const activeInstructorBooking = finalBookings.find(b => b.isInstructorSubsidy === 1);
      if (activeInstructorBooking) {
        console.log(`⚠️ Booking del instructor aún está: ${activeInstructorBooking.status}`);
      }
    }

    // Verificar reembolso al instructor
    const instructorFinal = await prisma.$queryRaw`
      SELECT credits FROM User WHERE id = ${realInstructorId}
    `;
    console.log(`💰 Créditos instructor final: ${instructorFinal[0].credits} céntimos`);
    console.log(`   (Debería ser igual que antes: ${instructorAfter[0].credits} céntimos)`);

    // Verificar puntos del usuario
    const userFinal = await prisma.$queryRaw`
      SELECT points FROM User WHERE id = ${testUserId}
    `;
    console.log(`💎 Puntos usuario final: ${userFinal[0].points}`);
    console.log(`   (Debería ser 1000 - precio de la plaza)`);

    console.log('\n✅ === TEST COMPLETADO ===\n');

  } catch (error) {
    console.error('\n❌ Error en test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testInstructorSubsidyFlow();
