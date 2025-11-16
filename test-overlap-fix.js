// Probar que el sistema previene solapamientos ahora
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOverlapPrevention() {
  console.log("=== TEST: PREVENCIÓN DE SOLAPAMIENTOS ===\n");
  
  // 1. Crear una clase de prueba en Pista 1 de 10:00-11:00
  const testStart = new Date('2025-11-01T10:00:00').getTime();
  const testEnd = new Date('2025-11-01T11:00:00').getTime();
  
  console.log("1️⃣  Creando clase de prueba:");
  console.log(`   Horario: 10:00-11:00`);
  console.log(`   Pista: 1\n`);
  
  await prisma.$executeRaw`
    INSERT INTO TimeSlot (id, clubId, instructorId, start, end, courtNumber, level, genderCategory, totalPrice, maxPlayers)
    VALUES ('test-overlap-1', 'club-padel-estrella', 'instructor-alex', ${testStart}, ${testEnd}, 1, 'intermedio', 'mixto', 12, 4)
  `;
  
  // 2. Probar query de detección de solapamiento
  const clubId = 'club-padel-estrella';
  
  // Caso A: Clase que solapa (10:30-11:30) - DEBE detectarla
  const overlapStart = new Date('2025-11-01T10:30:00').getTime();
  const overlapEnd = new Date('2025-11-01T11:30:00').getTime();
  
  console.log("2️⃣  Probando detección para clase solapada (10:30-11:30):");
  
  const occupiedA = await prisma.$queryRaw`
    SELECT courtNumber FROM TimeSlot 
    WHERE clubId = ${clubId}
    AND courtNumber IS NOT NULL
    AND id != 'test-new'
    AND start < ${overlapEnd}
    AND end > ${overlapStart}
    GROUP BY courtNumber
  `;
  
  if (occupiedA.some(c => c.courtNumber === 1)) {
    console.log("   ✅ Pista 1 detectada como ocupada (CORRECTO)\n");
  } else {
    console.log("   ❌ Pista 1 NO detectada (ERROR - permitiría solapamiento)\n");
  }
  
  // Caso B: Clase que NO solapa (11:00-12:00) - NO debe detectarla
  const noOverlapStart = new Date('2025-11-01T11:00:00').getTime();
  const noOverlapEnd = new Date('2025-11-01T12:00:00').getTime();
  
  console.log("3️⃣  Probando detección para clase NO solapada (11:00-12:00):");
  
  const occupiedB = await prisma.$queryRaw`
    SELECT courtNumber FROM TimeSlot 
    WHERE clubId = ${clubId}
    AND courtNumber IS NOT NULL
    AND id != 'test-new'
    AND start < ${noOverlapEnd}
    AND end > ${noOverlapStart}
    GROUP BY courtNumber
  `;
  
  if (occupiedB.some(c => c.courtNumber === 1)) {
    console.log("   ❌ Pista 1 detectada como ocupada (ERROR - es consecutiva, no solapa)\n");
  } else {
    console.log("   ✅ Pista 1 NO detectada (CORRECTO - clase consecutiva es válida)\n");
  }
  
  // Limpieza
  await prisma.$executeRaw`DELETE FROM TimeSlot WHERE id = 'test-overlap-1'`;
  
  console.log("=".repeat(50));
  console.log("✅ TEST COMPLETADO");
  console.log("=".repeat(50));
  
  await prisma.$disconnect();
}

testOverlapPrevention();
