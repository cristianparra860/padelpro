/**
 * Script para actualizar niveles de clases CON inscripciones
 * al rango correcto basado en el nivel del primer usuario inscrito
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function findLevelRange(userLevel, ranges) {
  if (!ranges || !Array.isArray(ranges)) return null;
  
  for (const range of ranges) {
    if (userLevel >= range.minLevel && userLevel <= range.maxLevel) {
      return `${range.minLevel}-${range.maxLevel}`;
    }
  }
  return null;
}

async function fixClassesWithBookings() {
  console.log('🔧 Actualizando niveles de clases CON inscripciones...\n');
  
  try {
    // Obtener todas las clases con inscripciones
    const slotsWithBookings = await prisma.$queryRaw`
      SELECT DISTINCT
        ts.id,
        ts.level,
        ts.instructorId,
        i.name as instructorName,
        i.levelRanges
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      WHERE EXISTS (
        SELECT 1 FROM Booking 
        WHERE timeSlotId = ts.id 
        AND status != 'CANCELLED'
      )
      AND (ts.level = 'abierto' OR ts.level = 'ABIERTO')
    `;
    
    console.log(`📊 Clases con inscripciones a actualizar: ${slotsWithBookings.length}\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const slot of slotsWithBookings) {
      // Obtener primer usuario inscrito
      const firstBooking = await prisma.$queryRaw`
        SELECT u.level as userLevel, u.name as userName
        FROM Booking b
        JOIN User u ON b.userId = u.id
        WHERE b.timeSlotId = ${slot.id}
          AND b.status != 'CANCELLED'
        ORDER BY b.createdAt ASC
        LIMIT 1
      `;
      
      if (firstBooking.length === 0) {
        skippedCount++;
        continue;
      }
      
      const user = firstBooking[0];
      const userLevel = parseFloat(user.userLevel);
      
      // Si el instructor NO tiene rangos, dejar como ABIERTO
      if (!slot.levelRanges) {
        console.log(`⏭️  ${slot.instructorName} - Sin rangos configurados, dejando como ABIERTO`);
        skippedCount++;
        continue;
      }
      
      // Calcular el rango correcto
      try {
        const ranges = JSON.parse(slot.levelRanges);
        const correctRange = findLevelRange(userLevel, ranges);
        
        if (correctRange) {
          console.log(`✅ ${slot.instructorName} | Usuario: ${user.userName} (${user.userLevel}) → Rango: ${correctRange}`);
          
          await prisma.$executeRaw`
            UPDATE TimeSlot 
            SET level = ${correctRange},
                levelRange = ${correctRange},
                updatedAt = datetime('now')
            WHERE id = ${slot.id}
          `;
          
          updatedCount++;
        } else {
          console.log(`⚠️  ${slot.instructorName} | Usuario: ${user.userName} (${user.userLevel}) - No coincide con ningún rango`);
          skippedCount++;
        }
      } catch (e) {
        console.log(`❌ Error con ${slot.instructorName}: ${e.message}`);
        skippedCount++;
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log(`✅ Clases actualizadas: ${updatedCount}`);
    console.log(`⏭️  Clases omitidas: ${skippedCount}`);
    console.log('='.repeat(70));
    console.log('\n💡 Refresca el navegador para ver los cambios');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixClassesWithBookings();
