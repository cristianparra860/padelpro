// Verificar propuestas y clases confirmadas del mismo instructor en horarios solapados
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOverlaps() {
  console.log("=== VERIFICANDO PROPUESTAS VS CLASES CONFIRMADAS ===\n");
  
  // 1. Obtener todas las clases confirmadas
  const confirmed = await prisma.$queryRaw`
    SELECT 
      id,
      instructorId,
      start,
      end,
      courtNumber,
      datetime(start/1000, 'unixepoch', 'localtime') as startFormatted,
      typeof(start) as startType
    FROM TimeSlot
    WHERE courtNumber IS NOT NULL
    ORDER BY start
  `;
  
  console.log(`📗 Clases confirmadas: ${confirmed.length}\n`);
  
  // 2. Obtener todas las propuestas
  const proposals = await prisma.$queryRaw`
    SELECT 
      id,
      instructorId,
      start,
      end,
      datetime(start/1000, 'unixepoch', 'localtime') as startFormatted,
      typeof(start) as startType
    FROM TimeSlot
    WHERE courtNumber IS NULL
    ORDER BY start
    LIMIT 10
  `;
  
  console.log(`🟧 Propuestas: ${proposals.length} (mostrando 10)\n`);
  
  if (proposals.length > 0) {
    console.log("Ejemplo de propuesta:");
    const p = proposals[0];
    console.log(`  ID: ${p.id}`);
    console.log(`  Instructor: ${p.instructorId}`);
    console.log(`  Horario: ${p.startFormatted}`);
    console.log(`  Start value: ${p.start}`);
    console.log(`  Start type: ${p.startType}\n`);
  }
  
  if (confirmed.length > 0) {
    console.log("Ejemplo de clase confirmada:");
    const c = confirmed[0];
    console.log(`  ID: ${c.id}`);
    console.log(`  Instructor: ${c.instructorId}`);
    console.log(`  Horario: ${c.startFormatted}`);
    console.log(`  Pista: ${c.courtNumber}`);
    console.log(`  Start value: ${c.start}`);
    console.log(`  Start type: ${c.startType}\n`);
  }
  
  // 3. Buscar solapamientos
  console.log("=".repeat(60));
  console.log("🔍 BUSCANDO SOLAPAMIENTOS...\n");
  
  let overlapCount = 0;
  
  for (const conf of confirmed) {
    const overlappingProposals = proposals.filter(prop => {
      // Mismo instructor
      if (prop.instructorId !== conf.instructorId) return false;
      
      // Verificar solapamiento en horario
      const propStart = typeof prop.start === 'string' ? new Date(prop.start).getTime() : prop.start;
      const propEnd = typeof prop.end === 'string' ? new Date(prop.end).getTime() : prop.end;
      const confStart = typeof conf.start === 'string' ? new Date(conf.start).getTime() : conf.start;
      const confEnd = typeof conf.end === 'string' ? new Date(conf.end).getTime() : conf.end;
      
      return propStart < confEnd && propEnd > confStart;
    });
    
    if (overlappingProposals.length > 0) {
      overlapCount += overlappingProposals.length;
      console.log(`❌ Clase confirmada en Pista ${conf.courtNumber}:`);
      console.log(`   Horario: ${conf.startFormatted}`);
      console.log(`   Instructor: ${conf.instructorId}`);
      console.log(`   Propuestas solapadas: ${overlappingProposals.length}`);
      overlappingProposals.forEach(p => {
        console.log(`      - ${p.startFormatted} (ID: ${p.id.substring(0, 20)}...)`);
      });
      console.log();
    }
  }
  
  console.log("=".repeat(60));
  if (overlapCount > 0) {
    console.log(`❌ ENCONTRADOS ${overlapCount} SOLAPAMIENTOS`);
    console.log("   Las propuestas deberían haberse eliminado al confirmar la clase");
  } else {
    console.log("✅ NO HAY SOLAPAMIENTOS - Sistema funcionando correctamente");
  }
  console.log("=".repeat(60));
  
  await prisma.$disconnect();
}

checkOverlaps();
