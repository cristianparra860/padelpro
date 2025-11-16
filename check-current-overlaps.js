// Verificar el estado actual de las clases confirmadas
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOverlaps() {
  console.log("=== VERIFICANDO CLASES SOLAPADAS EN LA DB ===\n");
  
  // Obtener todas las clases confirmadas (con pista asignada)
  const confirmedClasses = await prisma.$queryRaw`
    SELECT 
      id,
      courtNumber,
      start,
      end,
      datetime(start/1000, 'unixepoch', 'localtime') as startFormatted,
      datetime(end/1000, 'unixepoch', 'localtime') as endFormatted
    FROM TimeSlot
    WHERE courtNumber IS NOT NULL
    ORDER BY courtNumber, start
  `;
  
  console.log(`Total clases confirmadas: ${confirmedClasses.length}\n`);
  
  // Agrupar por pista
  const byPista = {};
  confirmedClasses.forEach(c => {
    if (!byPista[c.courtNumber]) byPista[c.courtNumber] = [];
    byPista[c.courtNumber].push(c);
  });
  
  // Detectar solapamientos
  let overlapCount = 0;
  
  Object.keys(byPista).forEach(pista => {
    const classes = byPista[pista];
    console.log(`\n🏟️  Pista ${pista}: ${classes.length} clase(s)`);
    
    for (let i = 0; i < classes.length; i++) {
      const c1 = classes[i];
      console.log(`   - ${c1.startFormatted} a ${c1.endFormatted}`);
      
      for (let j = i + 1; j < classes.length; j++) {
        const c2 = classes[j];
        
        // Detectar solapamiento: c1.start < c2.end AND c1.end > c2.start
        if (c1.start < c2.end && c1.end > c2.start) {
          overlapCount++;
          console.log(`   ⚠️  SOLAPAMIENTO DETECTADO:`);
          console.log(`      Clase 1: ${c1.startFormatted} - ${c1.endFormatted}`);
          console.log(`      Clase 2: ${c2.startFormatted} - ${c2.endFormatted}`);
        }
      }
    }
  });
  
  console.log("\n" + "=".repeat(50));
  if (overlapCount > 0) {
    console.log(`❌ ENCONTRADOS ${overlapCount} SOLAPAMIENTOS`);
    console.log("   El fix debe eliminar estos solapamientos.");
  } else {
    console.log("✅ NO HAY SOLAPAMIENTOS");
  }
  console.log("=".repeat(50));
  
  await prisma.$disconnect();
}

checkOverlaps();
