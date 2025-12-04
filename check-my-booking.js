const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBooking() {
  try {
    // Buscar TimeSlots del 6 de diciembre a las 13:00
    const dec6_13h = new Date('2025-12-06T13:00:00.000Z').getTime();
    
    console.log('🔍 Buscando clases del 6 de diciembre a las 13:00...\n');
    
    const slots = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.level,
        ts.levelRange,
        ts.genderCategory,
        ts.courtId,
        ts.start,
        i.name as instructorName,
        i.levelRanges,
        (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id AND status != 'CANCELLED') as bookingCount
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      WHERE ts.start = ${dec6_13h}
      ORDER BY i.name
    `;
    
    console.log(`📊 Total de clases encontradas: ${slots.length}\n`);
    
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const date = new Date(Number(s.start));
      
      console.log(`${i + 1}. ${s.instructorName || 'Sin instructor'}`);
      console.log(`   Fecha: ${date.toLocaleString('es-ES')}`);
      console.log(`   Level: "${s.level}"`);
      console.log(`   LevelRange: "${s.levelRange || 'NULL'}"`);
      console.log(`   Género: ${s.genderCategory || 'NULL'}`);
      console.log(`   Pista asignada: ${s.courtId ? 'SÍ' : 'NO'}`);
      console.log(`   Inscripciones: ${s.bookingCount}`);
      
      // Verificar rangos del instructor
      if (s.levelRanges) {
        try {
          const ranges = JSON.parse(s.levelRanges);
          console.log(`   Rangos del instructor:`);
          ranges.forEach(r => {
            console.log(`     • ${r.minLevel} - ${r.maxLevel}`);
          });
        } catch (e) {
          console.log(`   ⚠️ Error parseando rangos`);
        }
      } else {
        console.log(`   ℹ️ Instructor sin rangos configurados`);
      }
      
      // Verificar si el nivel es correcto
      if (Number(s.bookingCount) > 0) {
        const isIndividualLevel = /^\d+\.\d+$/.test(s.level);
        const isRange = /^\d+(\.\d+)?-\d+(\.\d+)?$/.test(s.level);
        
        if (isIndividualLevel) {
          console.log(`   ❌ PROBLEMA: Muestra nivel individual "${s.level}"`);
        } else if (isRange) {
          console.log(`   ✅ CORRECTO: Muestra rango "${s.level}"`);
        } else if (s.level === 'ABIERTO' || s.level === 'abierto') {
          console.log(`   ✅ CORRECTO: Clase abierta a todos los niveles`);
        }
      }
      
      console.log('');
    }
    
    // Buscar la inscripción más reciente
    console.log('=' .repeat(70));
    console.log('🔍 Buscando tu inscripción más reciente...\n');
    
    const recentBooking = await prisma.$queryRaw`
      SELECT 
        b.id,
        b.userId,
        b.groupSize,
        b.status,
        b.createdAt,
        ts.level,
        ts.levelRange,
        ts.start,
        i.name as instructorName,
        u.name as userName,
        u.level as userLevel
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      JOIN User u ON b.userId = u.id
      WHERE ts.start = ${dec6_13h}
      ORDER BY b.createdAt DESC
      LIMIT 1
    `;
    
    if (recentBooking.length > 0) {
      const booking = recentBooking[0];
      const bookingDate = new Date(Number(booking.createdAt));
      
      console.log('📝 Última inscripción del 6/12 a las 13:00:');
      console.log(`   Usuario: ${booking.userName}`);
      console.log(`   Nivel del usuario: ${booking.userLevel}`);
      console.log(`   Instructor: ${booking.instructorName}`);
      console.log(`   Modalidad: ${booking.groupSize} jugador${booking.groupSize > 1 ? 'es' : ''}`);
      console.log(`   Estado: ${booking.status}`);
      console.log(`   Fecha inscripción: ${bookingDate.toLocaleString('es-ES')}`);
      console.log(`\n   📊 NIVEL EN LA TARJETA:`);
      console.log(`      Level: "${booking.level}"`);
      console.log(`      LevelRange: "${booking.levelRange || 'NULL'}"`);
      
      const isIndividualLevel = /^\d+\.\d+$/.test(booking.level);
      const isRange = /^\d+(\.\d+)?-\d+(\.\d+)?$/.test(booking.level);
      
      console.log('\n   🎯 VERIFICACIÓN:');
      if (isIndividualLevel) {
        console.log(`      ❌ Muestra nivel individual: "${booking.level}"`);
        console.log(`      ⚠️ Debería mostrar un rango (ej: "5-7") o "ABIERTO"`);
      } else if (isRange) {
        console.log(`      ✅ Muestra rango correctamente: "${booking.level}"`);
      } else if (booking.level === 'ABIERTO' || booking.level === 'abierto') {
        console.log(`      ✅ Clase abierta a todos: "${booking.level}"`);
      }
    } else {
      console.log('⚠️ No se encontró ninguna inscripción reciente');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBooking();
