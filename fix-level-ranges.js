/**
 * Script para corregir los niveles de TimeSlots existentes.
 * Cambia niveles individuales (ej: "5.0") por rangos del instructor (ej: "5-7")
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

async function fixLevelRanges() {
  console.log('🔧 Corrigiendo niveles de TimeSlots existentes...\n');
  
  try {
    // Obtener TODAS las clases (con o sin pista asignada)
    const slots = await prisma.$queryRaw`
      SELECT id, level, instructorId, levelRange, courtId
      FROM TimeSlot 
      WHERE level != 'ABIERTO' 
      AND level != 'abierto'
    `;
    
    console.log(`📊 Total de clases a revisar: ${slots.length}\n`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const slot of slots) {
      const currentLevel = slot.level;
      const isIndividualLevel = /^\d+\.\d+$/.test(currentLevel);
      
      // Solo procesar niveles individuales
      if (!isIndividualLevel) {
        skippedCount++;
        continue;
      }
      
      if (!slot.instructorId) {
        skippedCount++;
        continue;
      }
      
      // Obtener rangos del instructor
      const instructorData = await prisma.$queryRaw`
        SELECT name, levelRanges FROM Instructor WHERE id = ${slot.instructorId}
      `;
      
      if (!instructorData || instructorData.length === 0) {
        skippedCount++;
        continue;
      }
      
      const instructorName = instructorData[0].name;
      const levelRanges = instructorData[0].levelRanges;
      
      if (!levelRanges) {
        // Si no tiene rangos, cambiar a ABIERTO
        console.log(`🔄 ${instructorName} | ${currentLevel} → ABIERTO (sin rangos configurados)`);
        
        await prisma.$executeRaw`
          UPDATE TimeSlot 
          SET level = 'ABIERTO',
              levelRange = NULL,
              updatedAt = datetime('now')
          WHERE id = ${slot.id}
        `;
        
        fixedCount++;
        continue;
      }
      
      try {
        const ranges = JSON.parse(levelRanges);
        const userLevel = parseFloat(currentLevel);
        const correctRange = findLevelRange(userLevel, ranges);
        
        if (correctRange) {
          console.log(`✅ ${instructorName} | ${currentLevel} → ${correctRange}`);
          
          await prisma.$executeRaw`
            UPDATE TimeSlot 
            SET level = ${correctRange},
                levelRange = ${correctRange},
                updatedAt = datetime('now')
            WHERE id = ${slot.id}
          `;
          
          fixedCount++;
        } else {
          // No coincide con ningún rango, poner ABIERTO
          console.log(`⚠️ ${instructorName} | ${currentLevel} → ABIERTO (fuera de rango)`);
          
          await prisma.$executeRaw`
            UPDATE TimeSlot 
            SET level = 'ABIERTO',
                levelRange = NULL,
                updatedAt = datetime('now')
            WHERE id = ${slot.id}
          `;
          
          fixedCount++;
        }
      } catch (e) {
        console.log(`❌ Error parseando rangos: ${e.message}`);
        skippedCount++;
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log(`✅ Clases actualizadas: ${fixedCount}`);
    console.log(`⏭️ Clases omitidas: ${skippedCount}`);
    console.log('='.repeat(70));
    console.log('\n💡 Refresca el navegador para ver los cambios');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLevelRanges();
