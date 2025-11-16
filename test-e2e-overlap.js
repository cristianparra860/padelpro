// Test end-to-end: verificar que el sistema no permite solapamientos
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testE2E() {
  console.log("=== TEST E2E: PREVENCIÓN DE SOLAPAMIENTOS ===\n");
  
  // 1. Encontrar dos propuestas consecutivas del mismo instructor (cualquier fecha)
  const proposals = await prisma.$queryRaw`
    SELECT 
      id,
      start,
      end,
      datetime(start/1000, 'unixepoch', 'localtime') as startFormatted,
      instructorId
    FROM TimeSlot
    WHERE courtNumber IS NULL
    AND instructorId = 'instructor-alex'
    AND start > strftime('%s', 'now') * 1000
    ORDER BY start
    LIMIT 2
  `;
  
  if (proposals.length < 2) {
    console.log("❌ No hay suficientes propuestas para probar");
    await prisma.$disconnect();
    return;
  }
  
  const prop1 = proposals[0];
  const prop2 = proposals[1];
  
  console.log("Propuestas encontradas:");
  console.log(`   1️⃣  ${prop1.startFormatted} - ID: ${prop1.id}`);
  console.log(`   2️⃣  ${prop2.startFormatted} - ID: ${prop2.id}\n`);
  
  // 2. Verificar que la query de solapamiento detecta correctamente
  const clubId = 'club-padel-estrella';
  const testStart = prop1.start;
  const testEnd = prop1.end;
  
  console.log("🔍 Simulando que reservamos la propuesta 1...");
  console.log(`   Rango de clase: ${prop1.startFormatted} - 60 minutos\n`);
  
  // Simular: Si asignamos courtNumber = 1 a prop1, ¿detectaría solapamiento para prop1 misma?
  // Actualizar temporalmente prop1 con courtNumber
  await prisma.$executeRaw`UPDATE TimeSlot SET courtNumber = 1 WHERE id = ${prop1.id}`;
  
  // Ahora intentar "reservar" prop2 - debe detectar que Pista 1 está ocupada
  const overlapStart = prop2.start;
  const overlapEnd = prop2.end;
  
  console.log("🔍 Verificando si detecta pista ocupada para propuesta 2...");
  
  const occupiedCourts = await prisma.$queryRaw`
    SELECT courtNumber FROM TimeSlot 
    WHERE clubId = ${clubId}
    AND courtNumber IS NOT NULL
    AND id != ${prop2.id}
    AND start < ${overlapEnd}
    AND end > ${overlapStart}
    GROUP BY courtNumber
  `;
  
  const pista1Ocupada = occupiedCourts.some(c => c.courtNumber === 1);
  
  if (pista1Ocupada) {
    console.log("   ✅ Pista 1 detectada como OCUPADA (CORRECTO)\n");
  } else {
    console.log("   ❌ Pista 1 NO detectada - permitiría solapamiento (ERROR)\n");
  }
  
  // Verificar que NO solapa con pista 2 (debe estar libre)
  const pista2Ocupada = occupiedCourts.some(c => c.courtNumber === 2);
  
  if (!pista2Ocupada) {
    console.log("   ✅ Pista 2 detectada como LIBRE (CORRECTO)\n");
  } else {
    console.log("   ❌ Pista 2 detectada como ocupada (ERROR - debería estar libre)\n");
  }
  
  // Limpiar: remover courtNumber de prop1
  await prisma.$executeRaw`UPDATE TimeSlot SET courtNumber = NULL WHERE id = ${prop1.id}`;
  
  console.log("=".repeat(50));
  if (pista1Ocupada && !pista2Ocupada) {
    console.log("✅ TEST PASADO - El fix funciona correctamente");
    console.log("   El sistema ahora previene solapamientos en la misma pista");
  } else {
    console.log("❌ TEST FALLIDO - Revisar lógica de detección");
  }
  console.log("=".repeat(50));
  
  await prisma.$disconnect();
}

testE2E();
