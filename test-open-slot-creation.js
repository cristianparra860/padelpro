// Test: Verificar creación automática de tarjetas abiertas
const { PrismaClient } = require('@prisma/client');

// Usar el mismo patrón de singleton del proyecto
const prismaClientSingleton = () => {
  return new PrismaClient();
};

const globalForPrisma = global;

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

async function testOpenSlotCreation() {
  console.log('🧪 TEST: Verificación de creación de tarjetas abiertas\n');

  try {
    // 1. Buscar una clase sin reservas para testing
    console.log('📋 Paso 1: Buscando una clase ABIERTA sin reservas...');
    
    // Primero obtener el ID del usuario de prueba
    const testUser = await prisma.user.findFirst({
      where: {
        email: 'alex@example.com'
      }
    });

    if (!testUser) {
      console.log('❌ Usuario de prueba no encontrado (alex@example.com)');
      return;
    }
    
    const openSlots = await prisma.$queryRaw`
      SELECT ts.id, ts.start, ts.end, ts.instructorId, ts.level, ts.genderCategory, ts.clubId,
             i.name as instructorName,
             COUNT(b.id) as bookingCount
      FROM TimeSlot ts
      LEFT JOIN Booking b ON ts.id = b.timeSlotId AND b.status IN ('PENDING', 'CONFIRMED')
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      WHERE ts.courtId IS NULL
      AND ts.level = 'ABIERTO'
      AND ts.start > ${Date.now()}
      AND ts.id NOT IN (
        SELECT timeSlotId FROM Booking WHERE userId = ${testUser.id}
      )
      GROUP BY ts.id
      HAVING COUNT(b.id) = 0
      LIMIT 1
    `;

    if (openSlots.length === 0) {
      console.log('❌ No hay clases abiertas disponibles para testing (sin reservas previas del usuario)');
      return;
    }

    const testSlot = openSlots[0];
    console.log(`✅ Clase encontrada: ${testSlot.id}`);
    console.log(`   Instructor: ${testSlot.instructorName}`);
    console.log(`   Hora: ${new Date(testSlot.start).toLocaleString('es-ES')}`);
    console.log(`   Nivel: ${testSlot.level}`);
    console.log(`   Categoría: ${testSlot.genderCategory || 'NULL'}`);
    console.log(`   Reservas actuales: ${testSlot.bookingCount}\n`);

    // 2. Verificar usuario de prueba
    console.log('📋 Paso 2: Verificando usuario de prueba...');

    if (!testUser) {
      console.log('❌ No se encontró usuario de prueba');
      return;
    }

    console.log(`✅ Usuario: ${testUser.name} (${testUser.email})`);
    console.log(`   Género: ${testUser.gender}`);
    console.log(`   Nivel: ${testUser.level}\n`);

    // 3. Simular primera inscripción (llamar al API)
    console.log('📋 Paso 3: Simulando inscripción (esto clasificará la tarjeta)...');
    console.log('   🔄 Haciendo POST a /api/classes/book...\n');

    const bookingResponse = await fetch('http://localhost:9002/api/classes/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: testUser.id,
        timeSlotId: testSlot.id,
        groupSize: 1
      })
    });

    const bookingResult = await bookingResponse.json();

    if (!bookingResponse.ok) {
      console.log('❌ Error al hacer la reserva:', bookingResult.error || bookingResult.message || JSON.stringify(bookingResult));
      console.log(`   Status: ${bookingResponse.status} ${bookingResponse.statusText}`);
      return;
    }

    console.log('✅ Inscripción realizada exitosamente\n');

    // 4. Verificar que la tarjeta original se clasificó
    console.log('📋 Paso 4: Verificando clasificación de la tarjeta original...');
    
    const updatedSlot = await prisma.timeSlot.findUnique({
      where: { id: testSlot.id }
    });

    console.log(`   Tarjeta original (${testSlot.id}):`);
    console.log(`   - Nivel: ${updatedSlot.level} (esperado: ${testUser.level?.toUpperCase() || 'ABIERTO'})`);
    console.log(`   - Categoría: ${updatedSlot.genderCategory} (esperado: ${testUser.gender || 'mixto'})\n`);

    const isClassified = updatedSlot.level !== 'ABIERTO' || updatedSlot.genderCategory !== null;
    
    if (!isClassified) {
      console.log('❌ La tarjeta NO se clasificó correctamente');
      return;
    }

    console.log('✅ Tarjeta original clasificada correctamente\n');

    // 5. Buscar tarjeta abierta nueva
    console.log('📋 Paso 5: Buscando nueva tarjeta ABIERTA creada...');
    
    const newOpenSlots = await prisma.$queryRaw`
      SELECT id, level, genderCategory, start, end
      FROM TimeSlot
      WHERE instructorId = ${testSlot.instructorId}
      AND start = ${testSlot.start}
      AND level = 'ABIERTO'
      AND (genderCategory IS NULL OR genderCategory = 'mixto')
      AND id != ${testSlot.id}
    `;

    if (newOpenSlots.length === 0) {
      console.log('❌ NO se creó una nueva tarjeta ABIERTA');
      console.log('   El sistema debería crear una tarjeta ABIERTA cuando se clasifica la original\n');
    } else {
      console.log('✅ Nueva tarjeta ABIERTA encontrada:');
      newOpenSlots.forEach((slot, i) => {
        console.log(`   ${i + 1}. ID: ${slot.id}`);
        console.log(`      Nivel: ${slot.level}`);
        console.log(`      Categoría: ${slot.genderCategory || 'NULL'}`);
      });
      console.log('');
    }

    // 6. Cancelar la inscripción para probar la segunda parte
    console.log('📋 Paso 6: Cancelando inscripción para probar restauración...');
    
    // Inicializar variables para el resumen
    let restoredSlot = null;
    let finalOpenSlots = [];

    const booking = await prisma.booking.findFirst({
      where: {
        userId: testUser.id,
        timeSlotId: testSlot.id,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });

    if (booking) {
      const cancelResponse = await fetch('http://localhost:9002/api/classes/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: booking.id,
          userId: testUser.id,
          timeSlotId: testSlot.id
        })
      });

      const cancelResult = await cancelResponse.json();

      if (cancelResponse.ok) {
        console.log('✅ Inscripción cancelada\n');

        // 7. Verificar que la tarjeta volvió a ABIERTO
        console.log('📋 Paso 7: Verificando restauración a ABIERTO...');
        
        restoredSlot = await prisma.timeSlot.findUnique({
          where: { id: testSlot.id }
        });

        console.log(`   Tarjeta original después de cancelar:`);
        console.log(`   - Nivel: ${restoredSlot.level} (esperado: ABIERTO)`);
        console.log(`   - Categoría: ${restoredSlot.genderCategory || 'NULL'} (esperado: NULL)\n`);

        if (restoredSlot.level === 'ABIERTO' && !restoredSlot.genderCategory) {
          console.log('✅ Tarjeta restaurada correctamente a ABIERTO\n');
        } else {
          console.log('❌ Tarjeta NO restaurada correctamente\n');
        }

        // 8. Verificar que se creó otra tarjeta abierta después de cancelar
        console.log('📋 Paso 8: Verificando creación de tarjeta ABIERTA tras cancelación...');
        
        finalOpenSlots = await prisma.$queryRaw`
          SELECT id, level, genderCategory, createdAt
          FROM TimeSlot
          WHERE instructorId = ${testSlot.instructorId}
          AND start = ${testSlot.start}
          AND level = 'ABIERTO'
          AND (genderCategory IS NULL OR genderCategory = 'mixto')
          ORDER BY createdAt DESC
        `;

        console.log(`   Total de tarjetas ABIERTAS encontradas: ${finalOpenSlots.length}`);
        finalOpenSlots.forEach((slot, i) => {
          console.log(`   ${i + 1}. ID: ${slot.id}`);
          console.log(`      Creada: ${new Date(slot.createdAt).toLocaleString('es-ES')}`);
        });
        console.log('');

        if (finalOpenSlots.length >= 2) {
          console.log('✅ Se creó nueva tarjeta ABIERTA después de cancelar\n');
        } else {
          console.log('⚠️ No se encontraron tarjetas ABIERTAS adicionales\n');
        }

      } else {
        console.log('❌ Error al cancelar:', cancelResult.error);
      }
    }

    // Resumen final
    console.log('═══════════════════════════════════════════════');
    console.log('📊 RESUMEN DEL TEST:');
    console.log('═══════════════════════════════════════════════');
    console.log(`✓ Tarjeta original clasificada: ${isClassified ? 'SÍ' : 'NO'}`);
    console.log(`✓ Nueva tarjeta ABIERTA creada al inscribirse: ${newOpenSlots.length > 0 ? 'SÍ' : 'NO'}`);
    console.log(`✓ Tarjeta restaurada a ABIERTO al cancelar: ${restoredSlot?.level === 'ABIERTO' ? 'SÍ' : 'NO'}`);
    console.log(`✓ Nueva tarjeta ABIERTA creada al cancelar: ${finalOpenSlots?.length >= 2 ? 'SÍ' : 'NO'}`);
    console.log('═══════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error durante el test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el test
testOpenSlotCreation();
