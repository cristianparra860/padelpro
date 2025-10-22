const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCompletedClasses() {
  console.log('\n🔍 VERIFICACIÓN: Clases completadas vs disponibles\n');

  try {
    // 1. Clases CON pista asignada (completadas, BLOQUEADAS)
    const completedClasses = await prisma.$queryRaw`
      SELECT id, start, level, courtNumber, instructorId
      FROM TimeSlot 
      WHERE courtNumber IS NOT NULL
      ORDER BY start ASC
      LIMIT 5
    `;

    console.log(`🏆 CLASES COMPLETADAS (con pista asignada): ${completedClasses.length}`);
    completedClasses.forEach((cls, i) => {
      console.log(`   ${i+1}. ID: ${cls.id}`);
      console.log(`      Hora: ${new Date(cls.start).toLocaleString('es-ES')}`);
      console.log(`      Pista: ${cls.courtNumber}`);
      console.log(`      Instructor: ${cls.instructorId}`);
    });

    // 2. Clases SIN pista asignada (disponibles)
    const availableClasses = await prisma.$queryRaw`
      SELECT id, start, level, courtNumber, instructorId
      FROM TimeSlot 
      WHERE courtNumber IS NULL
      ORDER BY start ASC
      LIMIT 5
    `;

    console.log(`\n⏳ CLASES DISPONIBLES (sin pista asignada): ${availableClasses.length}`);
    availableClasses.forEach((cls, i) => {
      console.log(`   ${i+1}. ID: ${cls.id}`);
      console.log(`      Hora: ${new Date(cls.start).toLocaleString('es-ES')}`);
      console.log(`      Pista: ${cls.courtNumber || 'Sin asignar'}`);
      console.log(`      Instructor: ${cls.instructorId}`);
    });

    // 3. Verificar reservas canceladas
    const cancelledBookings = await prisma.$queryRaw`
      SELECT 
        b.id, 
        b.timeSlotId, 
        b.groupSize, 
        b.status,
        ts.courtNumber
      FROM Booking b
      JOIN TimeSlot ts ON ts.id = b.timeSlotId
      WHERE b.status = 'CANCELLED'
      AND ts.courtNumber IS NOT NULL
      LIMIT 10
    `;

    console.log(`\n❌ RESERVAS CANCELADAS (opciones perdedoras): ${cancelledBookings.length}`);
    cancelledBookings.forEach((booking, i) => {
      console.log(`   ${i+1}. Booking ID: ${booking.id}`);
      console.log(`      TimeSlot: ${booking.timeSlotId}`);
      console.log(`      Opción: ${booking.groupSize} jugador(es)`);
      console.log(`      Estado: ${booking.status}`);
      console.log(`      Pista de la clase: ${booking.courtNumber}`);
    });

    // 4. Total de clases
    const totalClasses = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN courtNumber IS NOT NULL THEN 1 END) as completed,
        COUNT(CASE WHEN courtNumber IS NULL THEN 1 END) as available
      FROM TimeSlot
    `;

    console.log(`\n📊 RESUMEN TOTAL:`);
    console.log(`   Total clases: ${totalClasses[0].total}`);
    console.log(`   Completadas (bloqueadas): ${totalClasses[0].completed}`);
    console.log(`   Disponibles: ${totalClasses[0].available}`);

    // 5. Verificar que NO hay solapamientos
    const overlaps = await prisma.$queryRaw`
      SELECT 
        t1.id as id1, 
        t2.id as id2, 
        t1.start, 
        t1.instructorId,
        t1.courtNumber as court1,
        t2.courtNumber as court2
      FROM TimeSlot t1
      JOIN TimeSlot t2 ON t1.start = t2.start 
        AND t1.instructorId = t2.instructorId
        AND t1.id < t2.id
        AND t1.courtNumber IS NOT NULL
        AND t2.courtNumber IS NOT NULL
    `;

    if (overlaps.length > 0) {
      console.log(`\n⚠️ SOLAPAMIENTOS DETECTADOS: ${overlaps.length}`);
      overlaps.forEach(overlap => {
        console.log(`   Instructor ${overlap.instructorId} tiene 2 clases al mismo tiempo:`);
        console.log(`      - ${overlap.id1} (Pista ${overlap.court1})`);
        console.log(`      - ${overlap.id2} (Pista ${overlap.court2})`);
      });
    } else {
      console.log(`\n✅ NO HAY SOLAPAMIENTOS - Sistema funcionando correctamente`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCompletedClasses();
