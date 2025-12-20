const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNineAMAvailability() {
  console.log('🔍 Verificando disponibilidad de las 9:00-10:00 AM\n');

  // Obtener todos los instructores activos
  const instructors = await prisma.instructor.findMany({
    where: { isActive: true }
  });

  console.log(`📚 Instructores activos: ${instructors.length}\n`);

  // Verificar día 22 de diciembre 2025
  const date = '2025-12-22';
  const dayOfWeek = 'Monday';
  const startTime = '09:00';
  const endTime = '10:00';

  console.log(`📅 Verificando día: ${date} (${dayOfWeek})`);
  console.log(`⏰ Horario: ${startTime} - ${endTime}\n`);

  for (const instructor of instructors) {
    console.log(`\n👤 ${instructor.name} (${instructor.id})`);
    console.log('─'.repeat(60));

    // 1. Verificar horarios de NO disponibilidad
    let unavailableHours = {};
    if (instructor.unavailableHours) {
      try {
        unavailableHours = JSON.parse(instructor.unavailableHours);
      } catch (e) {
        console.log('⚠️  Error parseando unavailableHours');
      }
    }

    const instructorUnavailableRanges = unavailableHours[dayOfWeek] || [];
    if (instructorUnavailableRanges.length > 0) {
      console.log('🚫 Horarios NO disponibles del instructor:');
      instructorUnavailableRanges.forEach(range => {
        console.log(`   - ${range.start} a ${range.end}`);
      });

      // Verificar si 09:00-10:00 está en el rango de NO disponibilidad
      const timeToMinutes = (time) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };

      const slotStartMin = timeToMinutes(startTime);
      const slotEndMin = timeToMinutes(endTime);

      let isInstructorAvailable = true;
      for (const unavailableRange of instructorUnavailableRanges) {
        const unavailableStartMin = timeToMinutes(unavailableRange.start);
        const unavailableEndMin = timeToMinutes(unavailableRange.end);
        
        if (slotStartMin < unavailableEndMin && slotEndMin > unavailableStartMin) {
          isInstructorAvailable = false;
          console.log(`   ❌ CONFLICTO: 09:00-10:00 está en rango no disponible`);
          break;
        }
      }

      if (isInstructorAvailable) {
        console.log(`   ✅ No hay conflicto con horarios no disponibles`);
      }
    } else {
      console.log('✅ No tiene restricciones de horario');
    }

    // 2. Verificar si tiene clase confirmada a las 9:00
    const startTimestamp = new Date(`${date}T${startTime}:00.000Z`).getTime();
    const confirmedClass = await prisma.$queryRaw`
      SELECT * FROM TimeSlot 
      WHERE instructorId = ${instructor.id}
      AND courtId IS NOT NULL
      AND start = ${startTimestamp}
      LIMIT 1
    `;

    if (confirmedClass && confirmedClass.length > 0) {
      console.log(`🟢 TIENE CLASE CONFIRMADA a las 9:00 (Pista ${confirmedClass[0].courtNumber})`);
    } else {
      console.log(`⚪ No tiene clase confirmada a las 9:00`);
    }

    // 3. Verificar si tiene propuesta a las 9:00
    const proposalClass = await prisma.$queryRaw`
      SELECT * FROM TimeSlot 
      WHERE instructorId = ${instructor.id}
      AND courtId IS NULL
      AND start = ${startTimestamp}
      LIMIT 1
    `;

    if (proposalClass && proposalClass.length > 0) {
      console.log(`🟠 TIENE PROPUESTA a las 9:00 (${proposalClass[0].level}, ${proposalClass[0].totalPrice}€)`);
    } else {
      console.log(`⚪ No tiene propuesta a las 9:00`);
    }

    // 4. Verificar InstructorSchedule
    const startDateTime = new Date(`${date}T${startTime}:00.000Z`);
    const endDateTime = new Date(`${date}T${endTime}:00.000Z`);

    const instructorSchedule = await prisma.$queryRaw`
      SELECT * FROM InstructorSchedule
      WHERE instructorId = ${instructor.id}
      AND date = ${date}
      AND isOccupied = 1
      AND (
        (startTime <= ${startDateTime.toISOString()} AND endTime > ${startDateTime.toISOString()})
        OR (startTime < ${endDateTime.toISOString()} AND endTime >= ${endDateTime.toISOString()})
        OR (startTime >= ${startDateTime.toISOString()} AND endTime <= ${endDateTime.toISOString()})
      )
      LIMIT 1
    `;

    if (instructorSchedule && instructorSchedule.length > 0) {
      console.log(`🔒 InstructorSchedule OCUPADO: ${instructorSchedule[0].startTime} - ${instructorSchedule[0].endTime}`);
    } else {
      console.log(`✅ InstructorSchedule LIBRE`);
    }
  }

  // 5. Verificar disponibilidad de pistas
  console.log('\n\n🏟️  DISPONIBILIDAD DE PISTAS');
  console.log('═'.repeat(60));

  const totalCourts = await prisma.court.count({ where: { isActive: true } });
  console.log(`Total de pistas activas: ${totalCourts}`);

  const startDateTime = new Date(`${date}T${startTime}:00.000Z`);
  const endDateTime = new Date(`${date}T${endTime}:00.000Z`);

  const occupiedCourts = await prisma.$queryRaw`
    SELECT cs.*, c.name as courtName FROM CourtSchedule cs
    JOIN Court c ON cs.courtId = c.id
    WHERE cs.date = ${date}
    AND cs.isOccupied = 1
    AND (
      (cs.startTime <= ${startDateTime.toISOString()} AND cs.endTime > ${startDateTime.toISOString()})
      OR (cs.startTime < ${endDateTime.toISOString()} AND cs.endTime >= ${endDateTime.toISOString()})
      OR (cs.startTime >= ${startDateTime.toISOString()} AND cs.endTime <= ${endDateTime.toISOString()})
    )
  `;

  console.log(`Pistas ocupadas a las 9:00: ${occupiedCourts.length}`);
  occupiedCourts.forEach(schedule => {
    console.log(`   - ${schedule.courtName}: ${schedule.startTime} - ${schedule.endTime}`);
  });

  const availableCourts = totalCourts - occupiedCourts.length;
  console.log(`\n✅ Pistas disponibles: ${availableCourts}`);

  await prisma.$disconnect();
}

checkNineAMAvailability().catch(console.error);
