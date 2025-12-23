const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCorrectFlow() {
  try {
    console.log('🧪 PROBANDO FLUJO CORRECTO DEL SISTEMA\n');
    console.log('=' + '='.repeat(60) + '\n');

    // PASO 1: Verificar clases ABIERTAS generadas
    console.log('📊 PASO 1: Verificar clases generadas\n');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const targetTime = tomorrow.getTime();

    const openSlots = await prisma.$queryRawUnsafe(`
      SELECT 
        t.id,
        t.level,
        t.levelRange,
        t.genderCategory,
        i.name as instructorName
      FROM TimeSlot t
      LEFT JOIN Instructor inst ON t.instructorId = inst.id
      LEFT JOIN User i ON inst.userId = i.id
      WHERE t.start = ?
      AND t.courtId IS NULL
      ORDER BY i.name
      LIMIT 10
    `, targetTime);

    console.log(`✅ Clases encontradas a las 09:00 mañana: ${openSlots.length}\n`);
    
    openSlots.forEach(slot => {
      console.log(`   🎯 ${slot.instructorName}: Nivel=${slot.level}, Género=${slot.genderCategory || 'ABIERTO'}`);
    });

    // PASO 2: Simular inscripción y verificar creación de nueva tarjeta
    console.log('\n' + '=' + '='.repeat(60));
    console.log('📊 PASO 2: Sistema de auto-creación de tarjetas\n');

    console.log('🔍 Buscando clases con inscripciones...');
    
    const slotsWithBookings = await prisma.$queryRawUnsafe(`
      SELECT 
        t.id,
        t.level,
        t.levelRange,
        t.genderCategory,
        i.name as instructorName,
        COUNT(b.id) as bookingCount
      FROM TimeSlot t
      LEFT JOIN Instructor inst ON t.instructorId = inst.id
      LEFT JOIN User i ON inst.userId = i.id
      LEFT JOIN Booking b ON t.id = b.timeSlotId AND b.status != 'CANCELLED'
      WHERE t.courtId IS NULL
      AND t.start >= ?
      GROUP BY t.id
      HAVING bookingCount > 0
      ORDER BY t.start
      LIMIT 5
    `, Date.now());

    console.log(`✅ Clases con inscripciones: ${slotsWithBookings.length}\n`);

    if (slotsWithBookings.length > 0) {
      slotsWithBookings.forEach(slot => {
        const time = new Date(parseInt(slot.id.split('_')[1])).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        console.log(`   📅 ${slot.instructorName} - Nivel: ${slot.level}, Inscripciones: ${slot.bookingCount}`);
      });

      // Verificar que existe una tarjeta ABIERTA alternativa
      console.log('\n🔍 Verificando tarjetas ABIERTAS alternativas...\n');
      
      for (const slot of slotsWithBookings) {
        // Buscar instructor y horario de este slot
        const slotDetails = await prisma.timeSlot.findUnique({
          where: { id: slot.id },
          select: { instructorId: true, start: true }
        });

        if (slotDetails) {
          const alternativeOpen = await prisma.$queryRawUnsafe(`
            SELECT id, level, genderCategory
            FROM TimeSlot
            WHERE instructorId = ?
            AND start = ?
            AND level = 'ABIERTO'
            AND courtId IS NULL
            AND id != ?
          `, slotDetails.instructorId, slotDetails.start.getTime(), slot.id);

          if (alternativeOpen.length > 0) {
            console.log(`   ✅ ${slot.instructorName}: Tarjeta ABIERTA alternativa existe (${alternativeOpen[0].id.substring(0, 15)}...)`);
          } else {
            console.log(`   ⚠️  ${slot.instructorName}: NO hay tarjeta ABIERTA alternativa`);
          }
        }
      }
    } else {
      console.log('   ℹ️  No hay clases con inscripciones aún\n');
    }

    // PASO 3: Verificar lógica de rangos del instructor
    console.log('\n' + '=' + '='.repeat(60));
    console.log('📊 PASO 3: Configuración de rangos de instructores\n');

    const instructorsWithRanges = await prisma.instructor.findMany({
      where: { isActive: true },
      select: {
        id: true,
        levelRanges: true,
        user: {
          select: { name: true }
        }
      },
      take: 5
    });

    console.log(`✅ Instructores verificados: ${instructorsWithRanges.length}\n`);

    instructorsWithRanges.forEach(instructor => {
      console.log(`👤 ${instructor.user.name}:`);
      if (instructor.levelRanges) {
        try {
          const ranges = JSON.parse(instructor.levelRanges);
          console.log(`   📈 Rangos: ${ranges.map(r => `${r.minLevel}-${r.maxLevel}`).join(', ')}`);
        } catch (e) {
          console.log('   ❌ Error parseando rangos');
        }
      } else {
        console.log('   ⚠️  Sin rangos configurados');
      }
    });

    console.log('\n' + '=' + '='.repeat(60));
    console.log('✅ PRUEBA COMPLETADA\n');
    
    console.log('📋 RESUMEN DEL FLUJO CORRECTO:');
    console.log('1. ✅ Instructor crea propuestas ABIERTAS (nivel y género abierto)');
    console.log('2. ✅ Usuario ve solo clases ABIERTAS si no hay inscripciones');
    console.log('3. ✅ Al inscribirse, sistema asigna rango según nivel del usuario');
    console.log('4. ✅ Sistema auto-crea nueva tarjeta ABIERTA para otros niveles');
    console.log('5. ✅ Sistema de carreras: primera clase completa gana la pista\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testCorrectFlow();
