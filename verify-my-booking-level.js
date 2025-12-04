const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSpecificBooking() {
  try {
    console.log('🔍 Verificando tu inscripción del 6/12 a las 13:00 con Carlos Martinez\n');
    console.log('='.repeat(70));
    
    // Buscar el TimeSlot específico
    const dec6_13h = new Date('2025-12-06T13:00:00.000Z').getTime();
    
    const slot = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.level,
        ts.levelRange,
        ts.genderCategory,
        ts.instructorId,
        i.name as instructorName,
        i.levelRanges,
        (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id AND status != 'CANCELLED') as bookingCount
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      WHERE ts.start = ${dec6_13h}
        AND i.name = 'Carlos Martinez'
      LIMIT 1
    `;
    
    if (slot.length === 0) {
      console.log('❌ No se encontró la clase');
      return;
    }
    
    const s = slot[0];
    const date = new Date(Number(dec6_13h));
    
    console.log('📅 CLASE ENCONTRADA:');
    console.log(`   Fecha: ${date.toLocaleString('es-ES')}`);
    console.log(`   Instructor: ${s.instructorName}`);
    console.log(`   Inscripciones: ${s.bookingCount}`);
    console.log('');
    
    console.log('📊 NIVEL MOSTRADO EN LA TARJETA:');
    console.log(`   Level: "${s.level}"`);
    console.log(`   LevelRange: "${s.levelRange || 'NULL'}"`);
    console.log(`   Género: ${s.genderCategory || 'NULL'}`);
    console.log('');
    
    // Verificar rangos del instructor
    console.log('👨‍🏫 RANGOS DEL INSTRUCTOR:');
    if (s.levelRanges) {
      try {
        const ranges = JSON.parse(s.levelRanges);
        ranges.forEach(r => {
          console.log(`   • ${r.minLevel} - ${r.maxLevel}`);
        });
      } catch (e) {
        console.log(`   ⚠️ Error parseando rangos`);
      }
    } else {
      console.log(`   ❌ Carlos Martinez NO tiene rangos configurados`);
      console.log(`   💡 Por eso el nivel es "abierto"`);
    }
    console.log('');
    
    // Verificar tipo de nivel
    console.log('🎯 VERIFICACIÓN:');
    const isIndividualLevel = /^\d+\.\d+$/.test(s.level);
    const isRange = /^\d+(\.\d+)?-\d+(\.\d+)?$/.test(s.level);
    const isAbierto = s.level === 'ABIERTO' || s.level === 'abierto';
    
    if (isIndividualLevel) {
      console.log(`   ❌ PROBLEMA: Muestra nivel individual "${s.level}"`);
      console.log(`   ⚠️ Debería mostrar un rango o "ABIERTO"`);
    } else if (isRange) {
      console.log(`   ✅ CORRECTO: Muestra rango "${s.level}"`);
    } else if (isAbierto) {
      console.log(`   ✅ CORRECTO: Clase abierta "${s.level}"`);
      console.log(`   💡 Esto es correcto porque Carlos Martinez no tiene rangos configurados`);
    } else {
      console.log(`   ⚠️ Nivel no reconocido: "${s.level}"`);
    }
    
    console.log('');
    console.log('='.repeat(70));
    console.log('📝 CONCLUSIÓN:');
    if (isAbierto && !s.levelRanges) {
      console.log('✅ El sistema funciona correctamente');
      console.log('✅ Como Carlos Martinez NO tiene rangos configurados,');
      console.log('✅ la clase se marca como "abierto" (cualquier nivel puede inscribirse)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificBooking();
