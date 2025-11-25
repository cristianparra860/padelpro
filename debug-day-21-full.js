/**
 * Debug: Verificar por qué el día 21 no tiene slots
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugDay21() {
  console.log('\n🔍 DEBUG: POR QUÉ NO HAY SLOTS EL 21 DE NOVIEMBRE\n');
  console.log('='.repeat(70));

  try {
    const date21 = '2025-11-21';
    
    // 1. Verificar instructores activos
    const instructors = await prisma.$queryRaw`
      SELECT id, name, isActive FROM Instructor
    `;
    
    console.log(`👥 Instructores totales: ${instructors.length}`);
    const activeInstructors = instructors.filter(i => i.isActive);
    console.log(`✅ Instructores activos: ${activeInstructors.length}\n`);

    if (activeInstructors.length === 0) {
      console.log('❌ NO HAY INSTRUCTORES ACTIVOS');
      return;
    }

    // 2. Verificar pistas activas
    const courts = await prisma.$queryRaw`
      SELECT id, number, isActive FROM Court
    `;
    
    console.log(`🏟️ Pistas totales: ${courts.length}`);
    const activeCourts = courts.filter(c => c.isActive);
    console.log(`✅ Pistas activas: ${activeCourts.length}\n`);

    if (activeCourts.length === 0) {
      console.log('❌ NO HAY PISTAS ACTIVAS');
      return;
    }

    // 3. Verificar si hay CourtSchedule bloqueando el día 21
    const courtSchedules = await prisma.$queryRaw`
      SELECT * FROM CourtSchedule 
      WHERE date = ${date21}
      AND isOccupied = 1
    `;

    console.log(`📅 CourtSchedule bloqueando ${date21}: ${courtSchedules.length}`);
    if (courtSchedules.length > 0) {
      console.log('⚠️ Pistas bloqueadas:\n');
      courtSchedules.slice(0, 5).forEach((cs, idx) => {
        console.log(`   ${idx + 1}. Court ${cs.courtId} - ${cs.startTime} a ${cs.endTime}`);
      });
      console.log('');
    }

    // 4. Verificar si hay InstructorSchedule bloqueando el día 21
    const instructorSchedules = await prisma.$queryRaw`
      SELECT * FROM InstructorSchedule 
      WHERE date = ${date21}
      AND isOccupied = 1
    `;

    console.log(`📅 InstructorSchedule bloqueando ${date21}: ${instructorSchedules.length}`);
    if (instructorSchedules.length > 0) {
      console.log('⚠️ Instructores bloqueados:\n');
      instructorSchedules.slice(0, 5).forEach((is, idx) => {
        console.log(`   ${idx + 1}. Instructor ${is.instructorId} - ${is.startTime} a ${is.endTime}`);
      });
      console.log('');
    }

    // 5. Verificar TimeSlots confirmados (con courtId) para el 21
    const confirmedSlots = await prisma.$queryRaw`
      SELECT ts.id, ts.start, ts.end, ts.courtId, i.name as instructorName
      FROM TimeSlot ts
      JOIN Instructor i ON i.id = ts.instructorId
      WHERE ts.start >= ${new Date('2025-11-21T00:00:00').getTime()}
      AND ts.start < ${new Date('2025-11-22T00:00:00').getTime()}
      AND ts.courtId IS NOT NULL
    `;

    console.log(`✅ TimeSlots CONFIRMADOS para ${date21}: ${confirmedSlots.length}`);
    if (confirmedSlots.length > 0) {
      console.log('🎯 Clases confirmadas:\n');
      confirmedSlots.forEach((slot, idx) => {
        const start = new Date(Number(slot.start));
        console.log(`   ${idx + 1}. ${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${slot.instructorName}`);
      });
      console.log('');
    }

    // 6. Intentar crear manualmente un slot para el 21 a las 10:00
    console.log('='.repeat(70));
    console.log('🧪 PRUEBA: Intentar crear slot manualmente para 21/11 10:00\n');

    const testStart = new Date('2025-11-21T10:00:00');
    const testEnd = new Date('2025-11-21T11:00:00');
    const testInstructor = activeInstructors[0].id;

    // Verificar si ya existe
    const existing = await prisma.$queryRaw`
      SELECT id FROM TimeSlot 
      WHERE instructorId = ${testInstructor}
      AND start = ${testStart.getTime()}
    `;

    if (existing.length > 0) {
      console.log('⚠️ Ya existe un slot para ese horario');
      console.log(`   ID: ${existing[0].id}`);
    } else {
      console.log('✅ No existe slot previo, intentando crear...\n');

      try {
        const newSlot = await prisma.timeSlot.create({
          data: {
            clubId: 'padel-estrella-madrid',
            instructorId: testInstructor,
            start: testStart,
            end: testEnd,
            maxPlayers: 4,
            totalPrice: 2000,
            instructorPrice: 1000,
            courtRentalPrice: 1000,
            level: 'ABIERTO',
            category: 'general',
            courtId: null
          }
        });

        console.log('✅ SLOT CREADO EXITOSAMENTE:');
        console.log(`   ID: ${newSlot.id}`);
        console.log(`   Fecha: ${newSlot.start.toLocaleString('es-ES')}`);
        console.log('\n💡 Si esto funcionó, el problema es del generador automático');
      } catch (error) {
        console.log('❌ ERROR AL CREAR SLOT:');
        console.log(`   ${error.message}`);
      }
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDay21();
