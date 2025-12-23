const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testLevelRangesSystem() {
  try {
    console.log('🧪 PROBANDO SISTEMA DE RANGOS DE NIVEL\n');
    console.log('=' + '='.repeat(60) + '\n');

    // 1. Verificar que los instructores tengan rangos configurados
    console.log('📊 PASO 1: Verificar rangos de instructores\n');
    
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true },
      select: {
        id: true,
        levelRanges: true,
        user: {
          select: { name: true }
        }
      }
    });

    console.log(`✅ Instructores activos: ${instructors.length}\n`);

    for (const instructor of instructors) {
      console.log(`👤 ${instructor.user.name} (${instructor.id}):`);
      
      if (instructor.levelRanges) {
        try {
          const ranges = JSON.parse(instructor.levelRanges);
          console.log(`   📈 Rangos configurados: ${ranges.length}`);
          ranges.forEach((range, i) => {
            console.log(`      ${i + 1}. ${range.minLevel} - ${range.maxLevel}`);
          });
        } catch (e) {
          console.log('   ❌ Error parseando levelRanges');
        }
      } else {
        console.log('   ⚠️  Sin rangos configurados (generará clases ABIERTAS)');
      }
      console.log('');
    }

    // 2. Verificar clases generadas con levelRange
    console.log('\n' + '=' + '='.repeat(60));
    console.log('📊 PASO 2: Verificar TimeSlots generados\n');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const startTimestamp = tomorrow.getTime();
    const endTimestamp = startTimestamp + 24 * 60 * 60 * 1000;

    const timeSlots = await prisma.$queryRawUnsafe(`
      SELECT 
        t.id,
        t.start,
        t.level,
        t.levelRange,
        t.instructorId,
        i.name as instructorName
      FROM TimeSlot t
      LEFT JOIN Instructor inst ON t.instructorId = inst.id
      LEFT JOIN User i ON inst.userId = i.id
      WHERE t.start >= ? AND t.start < ?
      AND t.courtId IS NULL
      ORDER BY t.start, t.instructorId, t.levelRange
      LIMIT 20
    `, startTimestamp, endTimestamp);

    console.log(`✅ TimeSlots encontrados: ${timeSlots.length}\n`);

    // Agrupar por instructor y horario
    const slotsByInstructorAndTime = {};
    
    timeSlots.forEach(slot => {
      const time = new Date(slot.start).toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const key = `${slot.instructorName} - ${time}`;
      
      if (!slotsByInstructorAndTime[key]) {
        slotsByInstructorAndTime[key] = [];
      }
      
      slotsByInstructorAndTime[key].push(slot);
    });

    console.log('📋 Clases por instructor y horario:\n');
    
    Object.entries(slotsByInstructorAndTime).forEach(([key, slots]) => {
      console.log(`🕐 ${key}:`);
      slots.forEach(slot => {
        const range = slot.levelRange || 'ABIERTO';
        const level = slot.level || 'ABIERTO';
        console.log(`   📊 Nivel: ${level} | Rango: ${range}`);
      });
      console.log('');
    });

    // 3. Simular filtrado por nivel de usuario
    console.log('\n' + '=' + '='.repeat(60));
    console.log('📊 PASO 3: Simular filtrado por nivel de usuario\n');

    const testUserLevels = [1.0, 3.5, 5.5];

    for (const userLevel of testUserLevels) {
      console.log(`\n👤 Usuario con nivel ${userLevel}:`);
      
      const matchingSlots = timeSlots.filter(slot => {
        // Si es ABIERTO, todos pueden acceder
        if (!slot.levelRange || slot.levelRange === 'ABIERTO' || slot.levelRange === 'null') {
          return true;
        }

        // Parsear rango
        if (slot.levelRange.includes('-')) {
          const [minStr, maxStr] = slot.levelRange.split('-');
          const minLevel = parseFloat(minStr);
          const maxLevel = parseFloat(maxStr);
          
          return userLevel >= minLevel && userLevel <= maxLevel;
        }

        return true;
      });

      console.log(`   ✅ Clases accesibles: ${matchingSlots.length}/${timeSlots.length}`);
      
      // Mostrar algunos ejemplos
      const examples = matchingSlots.slice(0, 3);
      if (examples.length > 0) {
        console.log('   📋 Ejemplos:');
        examples.forEach(slot => {
          const time = new Date(slot.start).toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          console.log(`      • ${slot.instructorName} - ${time} - Nivel: ${slot.levelRange || 'ABIERTO'}`);
        });
      }
    }

    console.log('\n' + '=' + '='.repeat(60));
    console.log('✅ PRUEBA COMPLETADA\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testLevelRangesSystem();
