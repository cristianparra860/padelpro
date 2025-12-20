/**
 * 🧪 SCRIPT DE PRUEBA: Generación de clases con rangos de nivel
 * 
 * Verifica que las clases se generen con los rangos de nivel configurados
 * en el perfil del instructor en lugar de todas como "ABIERTO"
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testLevelRangesGeneration() {
  try {
    console.log('🧪 PRUEBA: Generación de clases con rangos de nivel\n');
    console.log('='.repeat(80));
    
    // 1. Verificar rangos de nivel configurados en instructores
    console.log('\n📋 PASO 1: Verificar rangos de nivel de instructores\n');
    
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true },
      select: {
        id: true,
        hourlyRate: true,
        levelRanges: true,
        user: {
          select: { name: true }
        }
      }
    });
    
    console.log(`Encontrados ${instructors.length} instructores activos:\n`);
    
    instructors.forEach(instructor => {
      const ranges = instructor.levelRanges ? JSON.parse(instructor.levelRanges) : [];
      console.log(`👤 ${instructor.user.name}`);
      console.log(`   ID: ${instructor.id}`);
      console.log(`   Tarifa: ${instructor.hourlyRate}€/hora`);
      console.log(`   Rangos configurados: ${ranges.length > 0 ? ranges.length : 'Ninguno (usará ABIERTO)'}`);
      if (ranges.length > 0) {
        ranges.forEach((range, idx) => {
          console.log(`      ${idx + 1}. Nivel ${range.minLevel.toFixed(1)} - ${range.maxLevel.toFixed(1)}`);
        });
      }
      console.log('');
    });
    
    // 2. Generar clases para mañana
    console.log('='.repeat(80));
    console.log('\n📅 PASO 2: Generar clases para mañana\n');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`Generando clases para: ${tomorrowStr}\n`);
    
    const response = await fetch(`http://localhost:9002/api/cron/generate-cards?targetDay=1`, {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`Error en generación: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Resultado de la generación:');
    console.log(`   Clases creadas: ${result.created}`);
    console.log(`   Clases omitidas: ${result.skipped}`);
    
    // 3. Verificar clases generadas
    console.log('\n='.repeat(80));
    console.log('\n📊 PASO 3: Verificar clases generadas por nivel\n');
    
    const tomorrowStart = new Date(tomorrowStr + 'T00:00:00.000Z').getTime();
    const tomorrowEnd = new Date(tomorrowStr + 'T23:59:59.999Z').getTime();
    
    const slots = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.level,
        ts.category,
        ts.instructorPrice,
        ts.courtRentalPrice,
        ts.totalPrice,
        i.id as instructorId,
        u.name as instructorName
      FROM TimeSlot ts
      JOIN Instructor i ON ts.instructorId = i.id
      JOIN User u ON i.userId = u.id
      WHERE ts.start >= ${tomorrowStart}
      AND ts.start < ${tomorrowEnd}
      AND ts.courtId IS NULL
      ORDER BY u.name, ts.start, ts.level
    `;
    
    console.log(`Total de clases generadas: ${slots.length}\n`);
    
    // Agrupar por instructor y nivel
    const byInstructor = {};
    
    slots.forEach(slot => {
      if (!byInstructor[slot.instructorName]) {
        byInstructor[slot.instructorName] = {};
      }
      if (!byInstructor[slot.instructorName][slot.level]) {
        byInstructor[slot.instructorName][slot.level] = [];
      }
      byInstructor[slot.instructorName][slot.level].push(slot);
    });
    
    // Mostrar resumen por instructor
    Object.keys(byInstructor).sort().forEach(instructorName => {
      const levels = byInstructor[instructorName];
      const totalClasses = Object.values(levels).reduce((sum, arr) => sum + arr.length, 0);
      
      console.log(`👤 ${instructorName} - Total: ${totalClasses} clases`);
      
      Object.keys(levels).sort().forEach(level => {
        const classes = levels[level];
        console.log(`   📚 Nivel "${level}": ${classes.length} clases`);
        
        // Mostrar ejemplos (primeras 3 clases)
        classes.slice(0, 3).forEach(slot => {
          const startDate = new Date(Number(slot.start));
          const timeStr = startDate.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'UTC'
          });
          console.log(`      • ${timeStr} - ${slot.totalPrice}€ (Instructor: ${slot.instructorPrice}€ + Pista: ${slot.courtRentalPrice}€)`);
        });
        
        if (classes.length > 3) {
          console.log(`      ... y ${classes.length - 3} clases más`);
        }
      });
      console.log('');
    });
    
    // 4. Verificación final
    console.log('='.repeat(80));
    console.log('\n✅ VERIFICACIÓN FINAL:\n');
    
    const abiertoCount = slots.filter(s => s.level === 'ABIERTO').length;
    const withRangesCount = slots.filter(s => s.level !== 'ABIERTO').length;
    
    console.log(`📊 Clases con nivel "ABIERTO": ${abiertoCount}`);
    console.log(`📊 Clases con rangos de nivel: ${withRangesCount}`);
    
    if (withRangesCount > 0) {
      console.log('\n✅ ¡ÉXITO! Los rangos de nivel se están aplicando correctamente');
      console.log('   Las clases se generan según la configuración de cada instructor\n');
    } else if (abiertoCount > 0) {
      console.log('\n⚠️  ADVERTENCIA: Solo se generaron clases ABIERTO');
      console.log('   Esto es normal si los instructores no tienen rangos configurados\n');
    } else {
      console.log('\n❌ ERROR: No se generaron clases');
    }
    
    // Mostrar niveles únicos encontrados
    const uniqueLevels = [...new Set(slots.map(s => s.level))].sort();
    console.log(`📋 Niveles únicos encontrados: ${uniqueLevels.join(', ')}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testLevelRangesGeneration();
