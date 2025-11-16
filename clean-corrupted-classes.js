// Limpiar clases corruptas con fechas inválidas (1970)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanCorruptedClasses() {
  console.log("=== LIMPIANDO CLASES CORRUPTAS ===\n");
  
  // Buscar clases con fechas de 1970 (datos corruptos)
  const corruptedClasses = await prisma.$queryRaw`
    SELECT 
      id,
      start,
      end,
      courtNumber,
      datetime(start/1000, 'unixepoch', 'localtime') as startFormatted
    FROM TimeSlot
    WHERE start < 946684800000
  `;
  
  console.log(`Clases corruptas encontradas: ${corruptedClasses.length}`);
  
  if (corruptedClasses.length > 0) {
    console.log("\nClases a eliminar:");
    corruptedClasses.forEach(c => {
      console.log(`   - ID: ${c.id}, Fecha: ${c.startFormatted}, Pista: ${c.courtNumber}`);
    });
    
    // Eliminar las clases corruptas
    const result = await prisma.$executeRaw`
      DELETE FROM TimeSlot
      WHERE start < 946684800000
    `;
    
    console.log(`\n✅ ${result} clase(s) corrupta(s) eliminada(s)`);
  } else {
    console.log("\n✅ No hay clases corruptas");
  }
  
  await prisma.$disconnect();
}

cleanCorruptedClasses();
