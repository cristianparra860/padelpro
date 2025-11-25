/**
 * Test: Verificar que se crea tarjeta duplicada al clasificar TimeSlot
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDuplicateCard() {
  console.log('\n🧪 TEST: VERIFICAR CREACIÓN DE TARJETA DUPLICADA\n');
  console.log('='.repeat(70));

  try {
    // 1. Buscar una TimeSlot sin bookings (sin clasificar)
    const unclassifiedSlots = await prisma.$queryRaw`
      SELECT ts.id, ts.start, ts.instructorId, ts.genderCategory, ts.level,
             i.name as instructorName,
             COUNT(b.id) as bookingCount
      FROM TimeSlot ts
      LEFT JOIN Booking b ON b.timeSlotId = ts.id AND b.status IN ('PENDING', 'CONFIRMED')
      LEFT JOIN Instructor i ON i.id = ts.instructorId
      WHERE ts.courtId IS NULL
      AND ts.start > ${Date.now()}
      GROUP BY ts.id
      HAVING bookingCount = 0
      ORDER BY ts.start ASC
      LIMIT 5
    `;

    console.log(`📋 TimeSlots sin clasificar encontrados: ${unclassifiedSlots.length}\n`);

    if (unclassifiedSlots.length === 0) {
      console.log('⚠️ No hay TimeSlots disponibles para probar');
      console.log('💡 Crea una clase desde el navegador para probar');
      return;
    }

    // Mostrar slots disponibles
    unclassifiedSlots.forEach((slot, idx) => {
      const date = new Date(slot.start);
      console.log(`${idx + 1}. TimeSlot ${slot.id.slice(0, 8)}...`);
      console.log(`   📅 ${date.toLocaleString('es-ES')}`);
      console.log(`   👨‍🏫 ${slot.instructorName}`);
      console.log(`   📊 Nivel: ${slot.level || 'SIN CLASIFICAR'}`);
      console.log(`   🏷️ Categoría: ${slot.genderCategory || 'SIN CLASIFICAR'}`);
      console.log(`   📝 Bookings: ${Number(slot.bookingCount)}`);
      console.log('');
    });

    console.log('='.repeat(70));
    console.log('✅ VERIFICACIÓN:');
    console.log('   1. Haz una reserva en una de estas clases desde el navegador');
    console.log('   2. Verifica en la consola del servidor estos logs:');
    console.log('      - "🏷️ This is the FIRST booking for this TimeSlot, setting category..."');
    console.log('      - "🆕 Creating NEW open slot for other users to compete..."');
    console.log('      - "✅ New open slot created: [id]"');
    console.log('   3. Luego ejecuta este script de nuevo para verificar que se creó');
    console.log('');
    console.log('📌 Si NO ves esos logs, el código no se está ejecutando');

    // Buscar slots duplicados recientes (mismo instructor, misma hora)
    console.log('\n' + '='.repeat(70));
    console.log('🔍 VERIFICAR DUPLICADOS RECIENTES:\n');

    const recentDuplicates = await prisma.$queryRaw`
      SELECT ts1.id as slot1_id, ts1.level as slot1_level, ts1.genderCategory as slot1_category,
             ts2.id as slot2_id, ts2.level as slot2_level, ts2.genderCategory as slot2_category,
             ts1.start, i.name as instructorName,
             ts1.createdAt as slot1_created, ts2.createdAt as slot2_created
      FROM TimeSlot ts1
      JOIN TimeSlot ts2 ON ts1.instructorId = ts2.instructorId 
        AND ts1.start = ts2.start 
        AND ts1.id != ts2.id
      JOIN Instructor i ON i.id = ts1.instructorId
      WHERE ts1.courtId IS NULL AND ts2.courtId IS NULL
      AND ts1.createdAt > ${Date.now() - (24 * 60 * 60 * 1000)} -- Últimas 24 horas
      ORDER BY ts1.createdAt DESC
      LIMIT 10
    `;

    if (recentDuplicates.length > 0) {
      console.log(`✅ Encontrados ${recentDuplicates.length} pares de duplicados recientes:\n`);
      
      recentDuplicates.forEach((dup, idx) => {
        const date = new Date(dup.start);
        console.log(`${idx + 1}. Par duplicado:`);
        console.log(`   📅 ${date.toLocaleString('es-ES')}`);
        console.log(`   👨‍🏫 ${dup.instructorName}`);
        console.log(`   🎯 Slot 1: ${dup.slot1_level} / ${dup.slot1_category}`);
        console.log(`   🎯 Slot 2: ${dup.slot2_level} / ${dup.slot2_category}`);
        console.log('');
      });
    } else {
      console.log('⚠️ No se encontraron duplicados en las últimas 24 horas');
      console.log('💡 Esto puede significar:');
      console.log('   - No se han hecho reservas que clasifiquen TimeSlots');
      console.log('   - O el código de duplicación no se está ejecutando');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDuplicateCard();
