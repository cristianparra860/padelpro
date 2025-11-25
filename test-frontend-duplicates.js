/**
 * Test: Simular llamada al endpoint /api/timeslots para ver qué tarjetas devuelve
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTimeslotsEndpoint() {
  console.log('\n🧪 TEST: VERIFICAR TARJETAS EN FRONTEND\n');
  console.log('='.repeat(70));

  try {
    const clubId = 'padel-estrella-madrid';
    const now = Date.now();
    const tomorrow = now + (24 * 60 * 60 * 1000);

    console.log('📡 Simulando: GET /api/timeslots?clubId=padel-estrella-madrid\n');

    // Buscar slots duplicados del mismo instructor/hora
    const duplicates = await prisma.$queryRaw`
      SELECT ts1.id as slot1_id, ts1.level as slot1_level, ts1.genderCategory as slot1_category,
             ts2.id as slot2_id, ts2.level as slot2_level, ts2.genderCategory as slot2_category,
             ts1.start, i.name as instructorName,
             (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts1.id AND status IN ('PENDING', 'CONFIRMED')) as slot1_bookings,
             (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts2.id AND status IN ('PENDING', 'CONFIRMED')) as slot2_bookings
      FROM TimeSlot ts1
      JOIN TimeSlot ts2 ON ts1.instructorId = ts2.instructorId 
        AND ts1.start = ts2.start 
        AND ts1.id != ts2.id
      JOIN Instructor i ON i.id = ts1.instructorId
      WHERE ts1.courtId IS NULL AND ts2.courtId IS NULL
      AND ts1.start > ${now}
      AND ts1.start < ${tomorrow}
      ORDER BY ts1.start ASC
      LIMIT 5
    `;

    if (duplicates.length === 0) {
      console.log('⚠️ No hay tarjetas duplicadas para HOY');
      console.log('💡 Busquemos en toda la próxima semana...\n');

      const nextWeek = now + (7 * 24 * 60 * 60 * 1000);
      const duplicatesWeek = await prisma.$queryRaw`
        SELECT ts1.id as slot1_id, ts1.level as slot1_level, ts1.genderCategory as slot1_category,
               ts2.id as slot2_id, ts2.level as slot2_level, ts2.genderCategory as slot2_category,
               ts1.start, i.name as instructorName,
               (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts1.id AND status IN ('PENDING', 'CONFIRMED')) as slot1_bookings,
               (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts2.id AND status IN ('PENDING', 'CONFIRMED')) as slot2_bookings
        FROM TimeSlot ts1
        JOIN TimeSlot ts2 ON ts1.instructorId = ts2.instructorId 
          AND ts1.start = ts2.start 
          AND ts1.id != ts2.id
        JOIN Instructor i ON i.id = ts1.instructorId
        WHERE ts1.courtId IS NULL AND ts2.courtId IS NULL
        AND ts1.start > ${now}
        AND ts1.start < ${nextWeek}
        ORDER BY ts1.start ASC
        LIMIT 10
      `;

      if (duplicatesWeek.length === 0) {
        console.log('❌ No hay tarjetas duplicadas en la próxima semana');
        console.log('   El sistema NO está creando duplicados o ya se completaron');
        return;
      }

      console.log(`✅ Encontrados ${duplicatesWeek.length} pares de duplicados en la próxima semana:\n`);
      
      duplicatesWeek.forEach((dup, idx) => {
        const date = new Date(dup.start);
        console.log(`${idx + 1}. ${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${dup.instructorName}`);
        console.log(`   📊 Slot 1: ${dup.slot1_level || 'NULL'} / ${dup.slot1_category || 'NULL'} (${Number(dup.slot1_bookings)} bookings)`);
        console.log(`   📊 Slot 2: ${dup.slot2_level || 'NULL'} / ${dup.slot2_category || 'NULL'} (${Number(dup.slot2_bookings)} bookings)`);
        console.log('');
      });

      // Verificar si aparecen en el endpoint
      console.log('='.repeat(70));
      console.log('🔍 VERIFICANDO SI AMBOS SLOTS APARECEN EN /api/timeslots:\n');

      const firstDup = duplicatesWeek[0];
      const slot1 = await prisma.timeSlot.findUnique({ where: { id: firstDup.slot1_id } });
      const slot2 = await prisma.timeSlot.findUnique({ where: { id: firstDup.slot2_id } });

      console.log(`✅ Slot 1 (${slot1?.id?.slice(0, 8)}...): courtId=${slot1?.courtId || 'NULL'}`);
      console.log(`✅ Slot 2 (${slot2?.id?.slice(0, 8)}...): courtId=${slot2?.courtId || 'NULL'}`);

      if (slot1?.courtId || slot2?.courtId) {
        console.log('\n⚠️ PROBLEMA: Uno de los slots tiene courtId asignado');
        console.log('   Esto significa que ya se completó y ganó una pista');
        console.log('   El filtro courtId IS NULL los excluirá del frontend');
      } else {
        console.log('\n✅ Ambos slots tienen courtId=NULL');
        console.log('   Deberían aparecer en el frontend');
      }

    } else {
      console.log(`✅ Encontrados ${duplicates.length} pares de duplicados para HOY:\n`);
      
      duplicates.forEach((dup, idx) => {
        const date = new Date(dup.start);
        console.log(`${idx + 1}. ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${dup.instructorName}`);
        console.log(`   📊 Slot 1: ${dup.slot1_level || 'NULL'} / ${dup.slot1_category || 'NULL'} (${Number(dup.slot1_bookings)} bookings)`);
        console.log(`   📊 Slot 2: ${dup.slot2_level || 'NULL'} / ${dup.slot2_category || 'NULL'} (${Number(dup.slot2_bookings)} bookings)`);
        console.log('');
      });
    }

    // Verificar el filtro en el endpoint
    console.log('\n' + '='.repeat(70));
    console.log('🔍 VERIFICAR FILTRO courtId IS NULL EN ENDPOINT:\n');

    const totalSlots = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM TimeSlot
      WHERE clubId = ${clubId}
      AND start > ${now}
    `;

    const availableSlots = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM TimeSlot
      WHERE clubId = ${clubId}
      AND start > ${now}
      AND courtId IS NULL
    `;

    console.log(`Total TimeSlots futuros: ${Number(totalSlots[0].total)}`);
    console.log(`TimeSlots disponibles (courtId=NULL): ${Number(availableSlots[0].total)}`);
    console.log(`TimeSlots confirmados (courtId!=NULL): ${Number(totalSlots[0].total) - Number(availableSlots[0].total)}`);

    console.log('\n✅ CONCLUSIÓN:');
    console.log('   El endpoint /api/timeslots solo muestra slots con courtId=NULL');
    console.log('   Si una tarjeta duplicada desaparece, es porque se confirmó y ganó una pista');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTimeslotsEndpoint();
