// Limpiar propuestas que se solapan con clases confirmadas existentes
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanOverlappingProposals() {
  console.log("=== LIMPIANDO PROPUESTAS SOLAPADAS ===\n");
  
  // 1. Obtener todas las clases confirmadas
  const confirmed = await prisma.$queryRaw`
    SELECT 
      id,
      instructorId,
      start,
      end,
      courtNumber,
      datetime(
        CASE 
          WHEN typeof(start) = 'integer' THEN start/1000
          ELSE strftime('%s', start)
        END,
        'unixepoch', 'localtime'
      ) as startFormatted
    FROM TimeSlot
    WHERE courtNumber IS NOT NULL
  `;
  
  console.log(`📗 ${confirmed.length} clases confirmadas\n`);
  
  let totalDeleted = 0;
  
  for (const conf of confirmed) {
    // Convertir a timestamps
    const confStart = typeof conf.start === 'string' ? new Date(conf.start).getTime() : conf.start;
    const confEnd = typeof conf.end === 'string' ? new Date(conf.end).getTime() : conf.end;
    
    // 1. Encontrar propuestas solapadas
    const overlapping = await prisma.$queryRaw`
      SELECT id FROM TimeSlot
      WHERE instructorId = ${conf.instructorId}
      AND courtId IS NULL
      AND courtNumber IS NULL
      AND id != ${conf.id}
      AND (
        CASE 
          WHEN typeof(start) = 'text' THEN strftime('%s', start) * 1000
          ELSE start
        END
      ) >= ${confStart}
      AND (
        CASE 
          WHEN typeof(start) = 'text' THEN strftime('%s', start) * 1000
          ELSE start
        END
      ) < ${confEnd}
    `;
    
    if (overlapping.length > 0) {
      // 2. Eliminar bookings primero
      for (const prop of overlapping) {
        await prisma.$executeRaw`DELETE FROM Booking WHERE timeSlotId = ${prop.id}`;
      }
      
      // 3. Eliminar propuestas
      const deleted = await prisma.$executeRaw`
        DELETE FROM TimeSlot 
        WHERE instructorId = ${conf.instructorId}
        AND courtId IS NULL
        AND courtNumber IS NULL
        AND id != ${conf.id}
        AND (
          CASE 
            WHEN typeof(start) = 'text' THEN strftime('%s', start) * 1000
            ELSE start
          END
        ) >= ${confStart}
        AND (
          CASE 
            WHEN typeof(start) = 'text' THEN strftime('%s', start) * 1000
            ELSE start
          END
        ) < ${confEnd}
      `;
      
      console.log(`✅ Pista ${conf.courtNumber} - ${conf.startFormatted}: ${deleted} propuesta(s) eliminada(s)`);
      totalDeleted += deleted;
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log(`✅ LIMPIEZA COMPLETADA: ${totalDeleted} propuestas eliminadas`);
  console.log("=".repeat(60));
  
  await prisma.$disconnect();
}

cleanOverlappingProposals();
