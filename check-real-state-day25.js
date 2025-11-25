const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRealState() {
  console.log('🔍 VERIFICACIÓN REAL del día 25 a las 7:00...\n');
  
  // Buscar SIN zona horaria para evitar problemas
  const startTimestamp = new Date('2025-11-25T07:00:00').getTime();
  const endTimestamp = new Date('2025-11-25T08:00:00').getTime();
  
  const allSlots = await prisma.$queryRaw`
    SELECT ts.id, ts.level, ts.genderCategory, ts.start, ts.courtNumber,
           i.name as instructorName,
           COUNT(b.id) as bookingCount
    FROM TimeSlot ts
    LEFT JOIN Instructor i ON ts.instructorId = i.id
    LEFT JOIN Booking b ON ts.id = b.timeSlotId AND b.status IN ('PENDING', 'CONFIRMED')
    WHERE ts.start >= ${startTimestamp}
    AND ts.start < ${endTimestamp}
    GROUP BY ts.id
    ORDER BY ts.level DESC, ts.createdAt ASC
  `;

  console.log(`📊 Total tarjetas encontradas: ${allSlots.length}\n`);

  // Agrupar por instructor y nivel
  const byInstructor = {};
  allSlots.forEach(s => {
    const key = s.instructorName;
    if (!byInstructor[key]) {
      byInstructor[key] = { INTERMEDIO: 0, ABIERTO: 0, AVANZADO: 0, PRINCIPIANTE: 0 };
    }
    byInstructor[key][s.level] = (byInstructor[key][s.level] || 0) + 1;
  });

  console.log('📈 Tarjetas por instructor y nivel:\n');
  Object.entries(byInstructor).forEach(([instructor, levels]) => {
    console.log(`👨‍🏫 ${instructor}:`);
    Object.entries(levels).forEach(([level, count]) => {
      if (count > 0) {
        console.log(`   ${level}: ${count} tarjeta(s)`);
      }
    });
  });

  console.log('\n📋 Detalle de cada tarjeta:\n');
  allSlots.forEach((s, i) => {
    console.log(`${i + 1}. ${s.instructorName}`);
    console.log(`   Nivel: ${s.level} | Categoría: ${s.genderCategory || 'NULL'}`);
    console.log(`   Reservas: ${s.bookingCount}`);
    console.log(`   ID: ${s.id.substring(0, 25)}...`);
    console.log('');
  });

  // Verificar cuántas deberían ser
  const intermedioCount = allSlots.filter(s => s.level === 'INTERMEDIO').length;
  const abiertoCount = allSlots.filter(s => s.level === 'ABIERTO').length;

  console.log('🎯 VERIFICACIÓN:');
  console.log(`   Tarjetas INTERMEDIO (originales clasificadas): ${intermedioCount}`);
  console.log(`   Tarjetas ABIERTO (duplicadas): ${abiertoCount}`);
  console.log(`\n   ¿Se crearon las duplicadas? ${abiertoCount === intermedioCount ? '✅ SÍ' : '❌ NO'}`);
  
  if (abiertoCount < intermedioCount) {
    console.log(`\n   ⚠️ FALTAN ${intermedioCount - abiertoCount} tarjetas ABIERTO`);
  }

  await prisma.$disconnect();
}

checkRealState();
