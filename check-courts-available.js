const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCourtsAvailable() {
  const timeSlotId = 'cmhkwtlu5002ttg7g3xfrr1a8'; // 10:00 del 6 de nov
  const start = new Date('2025-11-06T10:00:00').getTime();
  const end = start + 60 * 60 * 1000; // +60 minutos
  
  console.log('🔍 Verificando disponibilidad de pistas a las 10:00 del 6 de noviembre\n');
  console.log(`TimeSlot ID: ${timeSlotId}`);
  console.log(`Rango: ${new Date(start).toLocaleString()} - ${new Date(end).toLocaleString()}\n`);
  
  // 1. Pistas ocupadas por otras clases
  const occupiedByClasses = await prisma.$queryRaw`
    SELECT id, courtNumber, start, end FROM TimeSlot 
    WHERE clubId = 'club-1'
    AND courtNumber IS NOT NULL
    AND id != ${timeSlotId}
    AND start < ${end}
    AND end > ${start}
  `;
  
  console.log(`📚 Pistas ocupadas por clases en ese horario: ${occupiedByClasses.length}`);
  occupiedByClasses.forEach(c => {
    console.log(`   - Pista ${c.courtNumber}: ${new Date(Number(c.start)).toLocaleTimeString()} - ${new Date(Number(c.end)).toLocaleTimeString()}`);
  });
  
  // 2. Pistas bloqueadas por CourtSchedule
  const occupiedBySchedule = await prisma.$queryRaw`
    SELECT c.number as courtNumber, cs.startTime, cs.endTime
    FROM CourtSchedule cs
    JOIN Court c ON cs.courtId = c.id
    WHERE c.clubId = 'club-1'
    AND cs.isOccupied = 1
    AND cs.startTime < ${end}
    AND cs.endTime > ${start}
  `;
  
  console.log(`\n🗓️ Pistas bloqueadas por horarios: ${occupiedBySchedule.length}`);
  occupiedBySchedule.forEach(c => {
    console.log(`   - Pista ${c.courtNumber}: ${new Date(Number(c.startTime)).toLocaleTimeString()} - ${new Date(Number(c.endTime)).toLocaleTimeString()}`);
  });
  
  // 3. Total de pistas del club
  const allCourts = await prisma.court.findMany({
    where: { clubId: 'club-1', isActive: true },
    orderBy: { number: 'asc' }
  });
  
  console.log(`\n🏟️ Total de pistas activas en el club: ${allCourts.length}`);
  allCourts.forEach(c => {
    console.log(`   - Pista ${c.number} (${c.surface})`);
  });
  
  // 4. Pistas disponibles
  const occupiedNumbers = [
    ...occupiedByClasses.map(c => c.courtNumber),
    ...occupiedBySchedule.map(c => c.courtNumber)
  ];
  
  const availableCourts = allCourts.filter(c => !occupiedNumbers.includes(c.number));
  
  console.log(`\n✅ Pistas disponibles: ${availableCourts.length}`);
  if (availableCourts.length > 0) {
    availableCourts.forEach(c => {
      console.log(`   - Pista ${c.number} ✅ LIBRE`);
    });
    console.log(`\n🎯 Primera pista disponible para asignar: Pista ${availableCourts[0].number}`);
  } else {
    console.log('   ⚠️ NO HAY PISTAS DISPONIBLES');
  }
  
  await prisma.$disconnect();
}

checkCourtsAvailable().catch(console.error);
