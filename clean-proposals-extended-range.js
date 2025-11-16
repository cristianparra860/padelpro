// Limpiar propuestas que se solapan O que no tienen 60 min disponibles
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanExtendedRange() {
  console.log("=== LIMPIANDO PROPUESTAS CON RANGO EXTENDIDO ===\n");
  
  // Obtener todas las clases confirmadas
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
  
  const classDuration = 60 * 60 * 1000; // 60 minutos
  let totalDeleted = 0;
  
  for (const conf of confirmed) {
    const confStart = typeof conf.start === 'string' ? new Date(conf.start).getTime() : conf.start;
    const confEnd = typeof conf.end === 'string' ? new Date(conf.end).getTime() : conf.end;
    
    // Rango extendido: desde (start - 60min) hasta (end)
    // Esto elimina propuestas que:
    // 1. Se solapan con la clase
    // 2. No tienen 60 minutos completos disponibles antes de la clase
    const deleteRangeStart = confStart - classDuration;
    const deleteRangeEnd = confEnd;
    
    // 1. Encontrar propuestas en rango extendido
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
      ) >= ${deleteRangeStart}
      AND (
        CASE 
          WHEN typeof(start) = 'text' THEN strftime('%s', start) * 1000
          ELSE start
        END
      ) < ${deleteRangeEnd}
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
        ) >= ${deleteRangeStart}
        AND (
          CASE 
            WHEN typeof(start) = 'text' THEN strftime('%s', start) * 1000
            ELSE start
          END
        ) < ${deleteRangeEnd}
      `;
      
      const deleteStartTime = new Date(deleteRangeStart).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const deleteEndTime = new Date(deleteRangeEnd).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      
      console.log(`✅ Pista ${conf.courtNumber} - ${conf.startFormatted}: ${deleted} propuesta(s) eliminada(s) (rango ${deleteStartTime}-${deleteEndTime})`);
      totalDeleted += deleted;
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log(`✅ LIMPIEZA COMPLETADA: ${totalDeleted} propuestas eliminadas`);
  console.log("=".repeat(60));
  
  await prisma.$disconnect();
}

cleanExtendedRange();
