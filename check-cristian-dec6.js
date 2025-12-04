const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCristianClassDec6() {
  try {
    console.log('🔍 Buscando clase del 6/12 a las 13:00 con Cristian Parra\n');
    
    const dec6_13h = new Date('2025-12-06T13:00:00.000Z').getTime();
    
    const slot = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.level,
        ts.levelRange,
        ts.genderCategory,
        ts.start,
        i.name as instructorName,
        i.levelRanges
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      WHERE ts.start = ${dec6_13h}
        AND i.name = 'Cristian Parra'
    `;
    
    if (slot.length === 0) {
      console.log('❌ No se encontró la clase');
      return;
    }
    
    const s = slot[0];
    console.log('📅 CLASE ENCONTRADA:');
    console.log(`   TimeSlot ID: ${s.id}`);
    console.log(`   level: "${s.level}"`);
    console.log(`   levelRange: "${s.levelRange || 'NULL'}"`);
    console.log(`   genderCategory: "${s.genderCategory || 'NULL'}"`);
    console.log('');
    
    const bookings = await prisma.$queryRaw`
      SELECT 
        b.id,
        b.groupSize,
        b.createdAt,
        u.name as userName,
        u.level as userLevel
      FROM Booking b
      JOIN User u ON b.userId = u.id
      WHERE b.timeSlotId = ${s.id}
        AND b.status != 'CANCELLED'
      ORDER BY b.createdAt ASC
    `;
    
    console.log(`📝 INSCRIPCIONES: ${bookings.length}`);
    bookings.forEach((b, i) => {
      const created = new Date(Number(b.createdAt));
      console.log(`   ${i + 1}. ${b.userName} - Nivel: ${b.userLevel} - Creada: ${created.toLocaleString('es-ES')}`);
    });
    console.log('');
    
    console.log('👨‍🏫 RANGOS DEL INSTRUCTOR:');
    if (s.levelRanges) {
      const ranges = JSON.parse(s.levelRanges);
      ranges.forEach(r => console.log(`   • ${r.minLevel} - ${r.maxLevel}`));
    }
    console.log('');
    
    console.log('🎯 RESULTADO:');
    if (s.level === '5.0' || /^\d+\.\d+$/.test(s.level)) {
      console.log(`❌ Muestra nivel individual: "${s.level}"`);
      console.log(`✅ Debería mostrar: "5-7"`);
      if (bookings.length > 0) {
        const firstDate = new Date(Number(bookings[0].createdAt));
        console.log(`\n⚠️ Primera inscripción: ${firstDate.toLocaleString('es-ES')}`);
        console.log(`   Esta clase se inscribió ANTES del fix (hoy 3/12 tarde)`);
      }
    } else if (/^\d+-\d+$/.test(s.level)) {
      console.log(`✅ CORRECTO: Muestra rango "${s.level}"`);
    } else {
      console.log(`ℹ️ Nivel: "${s.level}"`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCristianClassDec6();
