const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCourtAssignment() {
  const timeSlotId = 'cmhkwtlu5002ttg7g3xfrr1a8';
  const clubId = 'padel-estrella-madrid';
  const start = new Date('2025-11-06T10:00:00').getTime();
  const end = start + 60 * 60 * 1000;
  
  console.log('🧪 TEST: Simulando asignación de pista\n');
  
  // 1. Verificar pistas disponibles
  console.log('1️⃣ Verificando pistas disponibles...');
  
  const occupiedByClasses = await prisma.$queryRaw`
    SELECT courtNumber FROM TimeSlot 
    WHERE clubId = ${clubId}
    AND courtNumber IS NOT NULL
    AND id != ${timeSlotId}
    AND start < ${end}
    AND end > ${start}
    GROUP BY courtNumber
  `;
  
  const occupiedBySchedule = await prisma.$queryRaw`
    SELECT c.number as courtNumber
    FROM CourtSchedule cs
    JOIN Court c ON cs.courtId = c.id
    WHERE c.clubId = ${clubId}
    AND cs.isOccupied = 1
    AND cs.startTime < ${end}
    AND cs.endTime > ${start}
  `;
  
  const occupiedCourtNumbers = [
    ...occupiedByClasses.map(c => c.courtNumber),
    ...occupiedBySchedule.map(c => c.courtNumber)
  ];
  
  console.log(`   Pistas ocupadas:`, occupiedCourtNumbers);
  
  // 2. Obtener todas las pistas del club
  const clubCourts = await prisma.$queryRaw`
    SELECT number FROM Court 
    WHERE clubId = ${clubId}
    AND isActive = 1
    ORDER BY number ASC
  `;
  
  console.log(`   Total pistas activas: ${clubCourts.length}`);
  
  // 3. Encontrar primera pista disponible
  let courtAssigned = null;
  for (const court of clubCourts) {
    if (!occupiedCourtNumbers.includes(court.number)) {
      courtAssigned = court.number;
      break;
    }
  }
  
  if (courtAssigned) {
    console.log(`   ✅ Pista disponible encontrada: Pista ${courtAssigned}\n`);
    
    // 4. Obtener el courtId
    console.log('2️⃣ Obteniendo ID de la pista...');
    const courtInfo = await prisma.$queryRaw`
      SELECT id FROM Court WHERE number = ${courtAssigned} AND clubId = ${clubId} LIMIT 1
    `;
    
    console.log(`   Court Info:`, courtInfo);
    
    const assignedCourtId = courtInfo && courtInfo.length > 0 ? courtInfo[0].id : null;
    
    if (assignedCourtId) {
      console.log(`   ✅ Court ID obtenido: ${assignedCourtId}\n`);
      
      // 5. Actualizar TimeSlot
      console.log('3️⃣ Actualizando TimeSlot...');
      const result = await prisma.$executeRaw`
        UPDATE TimeSlot 
        SET courtId = ${assignedCourtId}, courtNumber = ${courtAssigned}, updatedAt = datetime('now')
        WHERE id = ${timeSlotId}
      `;
      
      console.log(`   ✅ TimeSlot actualizado (${result} row affected)\n`);
      
      // 6. Verificar el resultado
      console.log('4️⃣ Verificando resultado...');
      const updatedSlot = await prisma.timeSlot.findUnique({
        where: { id: timeSlotId },
        select: { courtNumber: true, courtId: true, genderCategory: true }
      });
      
      console.log(`   TimeSlot actualizado:`);
      console.log(`   - Pista: ${updatedSlot.courtNumber}`);
      console.log(`   - Court ID: ${updatedSlot.courtId}`);
      console.log(`   - Categoría: ${updatedSlot.genderCategory}`);
      
      if (updatedSlot.courtNumber === courtAssigned) {
        console.log('\n   ✅ ¡TEST EXITOSO! Pista asignada correctamente');
      } else {
        console.log('\n   ❌ ERROR: La pista no se asignó correctamente');
      }
    } else {
      console.log('   ❌ ERROR: No se pudo obtener el Court ID');
    }
  } else {
    console.log('   ❌ No hay pistas disponibles');
  }
  
  await prisma.$disconnect();
}

testCourtAssignment().catch(console.error);
