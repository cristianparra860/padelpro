const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyComplete() {
  try {
    console.log('\n🔍 VERIFICACIÓN COMPLETA DEL SISTEMA\n');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // 1. Verificar rangos del instructor
    console.log('1️⃣ RANGOS DEL INSTRUCTOR CRISTIAN PARRA:');
    console.log('─────────────────────────────────────────');
    const instructor = await prisma.instructor.findFirst({
      where: { user: { name: { contains: 'Cristian' } } },
      select: { 
        id: true, 
        levelRanges: true, 
        user: { select: { name: true } } 
      }
    });
    
    if (!instructor?.levelRanges) {
      console.log('❌ NO HAY RANGOS CONFIGURADOS\n');
      return;
    }
    
    const ranges = JSON.parse(instructor.levelRanges);
    console.log('✅ Rangos configurados:');
    ranges.forEach((r, i) => {
      console.log(`   Rango ${i + 1}: ${r.minLevel} - ${r.maxLevel}`);
    });
    console.log('');
    
    // 2. Verificar reservas de Marc Parra
    console.log('2️⃣ RESERVAS DE MARC PARRA:');
    console.log('─────────────────────────────────────────');
    const bookings = await prisma.$queryRaw`
      SELECT 
        b.id as bookingId,
        b.status,
        b.groupSize,
        u.name as userName,
        u.level as userLevel,
        ts.id as slotId,
        ts.start,
        ts.level as slotLevel,
        ts.levelRange,
        ts.genderCategory,
        ts.instructorId
      FROM Booking b
      JOIN User u ON b.userId = u.id
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE u.name LIKE '%Marc%'
      AND b.status != 'CANCELLED'
      AND ts.instructorId = ${instructor.id}
      ORDER BY ts.start ASC
    `;
    
    if (bookings.length === 0) {
      console.log('⚠️ No hay reservas activas\n');
      return;
    }
    
    bookings.forEach((booking, i) => {
      const date = new Date(Number(booking.start));
      const hasRange = booking.levelRange ? '✅' : '❌';
      console.log(`\n   Reserva ${i + 1}:`);
      console.log(`   📅 Fecha: ${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}`);
      console.log(`   👤 Usuario: ${booking.userName} (Nivel: ${booking.userLevel})`);
      console.log(`   👥 Modalidad: ${booking.groupSize} jugadores`);
      console.log(`   📊 Slot Level: ${booking.slotLevel}`);
      console.log(`   ${hasRange} Slot LevelRange: ${booking.levelRange || 'NULL'}`);
      
      if (!booking.levelRange) {
        // Intentar encontrar el rango correcto
        const userLevel = parseFloat(booking.userLevel);
        const matchingRange = ranges.find(r => userLevel >= r.minLevel && userLevel <= r.maxLevel);
        if (matchingRange) {
          console.log(`   💡 DEBERÍA SER: ${matchingRange.minLevel}-${matchingRange.maxLevel}`);
        }
      }
    });
    
    console.log('\n');
    
    // 3. Simular respuesta de API
    console.log('3️⃣ SIMULACIÓN DE RESPUESTA API:');
    console.log('─────────────────────────────────────────');
    
    const firstBooking = bookings[0];
    const apiResponse = {
      id: firstBooking.slotId,
      start: new Date(Number(firstBooking.start)).toISOString(),
      level: firstBooking.slotLevel,
      levelRange: firstBooking.levelRange || null,
      genderCategory: firstBooking.genderCategory,
      instructorId: firstBooking.instructorId
    };
    
    console.log(JSON.stringify(apiResponse, null, 2));
    console.log('');
    
    // 4. Verificar qué mostraría el frontend
    console.log('4️⃣ QUÉ MOSTRARÍA EL FRONTEND:');
    console.log('─────────────────────────────────────────');
    
    bookings.forEach((booking, i) => {
      let displayValue;
      if (booking.levelRange) {
        displayValue = booking.levelRange;
        console.log(`   Reserva ${i + 1}: ✅ "${displayValue}" (desde levelRange)`);
      } else if (booking.slotLevel) {
        displayValue = booking.slotLevel;
        console.log(`   Reserva ${i + 1}: ⚠️ "${displayValue}" (fallback a level)`);
      } else {
        displayValue = 'Abierto';
        console.log(`   Reserva ${i + 1}: ℹ️ "${displayValue}" (sin datos)`);
      }
    });
    
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════');
    
    // Resumen
    const allHaveRanges = bookings.every(b => b.levelRange);
    if (allHaveRanges) {
      console.log('✅ TODAS LAS RESERVAS TIENEN RANGO ASIGNADO');
    } else {
      console.log('⚠️ ALGUNAS RESERVAS NO TIENEN RANGO ASIGNADO');
      console.log('   Necesitas actualizar manualmente o reinscribir al usuario');
    }
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyComplete();
