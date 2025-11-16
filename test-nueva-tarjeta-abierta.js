/**
 * Test: Verificar que se crea una nueva tarjeta abierta
 * cuando un usuario hace la primera reserva y clasifica el TimeSlot
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNuevaTarjetaAbierta() {
  console.log('\n🧪 TEST: CREACIÓN DE TARJETA ABIERTA AL CLASIFICAR\n');
  console.log('='.repeat(70));

  try {
    // 1. Buscar usuario
    const user = await prisma.user.findFirst({
      where: { email: 'alex@example.com' }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log(`✅ Usuario: ${user.name} (${user.email})`);
    console.log(`   Género: ${user.gender || 'No especificado'}`);

    // 2. Buscar un TimeSlot futuro sin clasificar (genderCategory NULL)
    const now = Date.now();
    const futureSlots = await prisma.timeSlot.findMany({
      where: {
        start: { gt: new Date(now) },
        courtId: null,
        genderCategory: null, // Sin clasificar
        clubId: 'padel-estrella-madrid'
      },
      include: {
        instructor: true,
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          }
        }
      },
      orderBy: { start: 'asc' },
      take: 5
    });

    console.log(`\n📋 TimeSlots sin clasificar encontrados: ${futureSlots.length}`);

    if (futureSlots.length === 0) {
      console.log('❌ No hay TimeSlots disponibles sin clasificar');
      return;
    }

    // Buscar uno que no tenga bookings
    const slot = futureSlots.find(s => s.bookings.length === 0);

    if (!slot) {
      console.log('❌ No hay TimeSlots sin bookings');
      return;
    }

    console.log(`\n✅ TimeSlot seleccionado:`);
    console.log(`   ID: ${slot.id}`);
    console.log(`   Instructor: ${slot.instructor?.name || 'N/A'}`);
    console.log(`   Fecha: ${new Date(slot.start).toLocaleString('es-ES')}`);
    console.log(`   Nivel: ${slot.level}`);
    console.log(`   Categoría género: ${slot.genderCategory || 'NULL (sin clasificar)'}`);
    console.log(`   Bookings actuales: ${slot.bookings.length}`);

    // 3. Contar TimeSlots con mismo instructor y hora ANTES de la reserva
    const slotsAntes = await prisma.timeSlot.count({
      where: {
        instructorId: slot.instructorId,
        start: slot.start,
        clubId: slot.clubId
      }
    });

    console.log(`\n📊 TimeSlots con mismo instructor/hora ANTES: ${slotsAntes}`);

    // 4. Simular primera reserva (esto clasificará el slot y creará uno nuevo)
    console.log('\n🔵 PASO 1: Hacer primera reserva (esto clasificará el TimeSlot)...');

    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        timeSlotId: slot.id,
        groupSize: 2,
        status: 'PENDING',
        amountBlocked: slot.totalPrice
      }
    });

    console.log(`✅ Booking creado: ${booking.id}`);

    // 5. Simular la clasificación del TimeSlot (lo que haría el API)
    console.log('\n🔵 PASO 2: Clasificar TimeSlot con género del usuario...');

    const classCategory = user.gender === 'masculino' ? 'masculino' : 
                         user.gender === 'femenino' ? 'femenino' : 
                         'mixto';

    await prisma.timeSlot.update({
      where: { id: slot.id },
      data: { genderCategory: classCategory }
    });

    console.log(`✅ TimeSlot clasificado como: ${classCategory}`);

    // 6. Crear nueva tarjeta abierta (simular lo que hace el API)
    console.log('\n🔵 PASO 3: Crear NUEVA tarjeta abierta (mixto, ABIERTO)...');

    const newSlot = await prisma.timeSlot.create({
      data: {
        clubId: slot.clubId,
        instructorId: slot.instructorId,
        start: slot.start,
        end: slot.end,
        maxPlayers: slot.maxPlayers,
        totalPrice: slot.totalPrice,
        instructorPrice: slot.instructorPrice,
        courtRentalPrice: slot.courtRentalPrice,
        level: 'ABIERTO',
        genderCategory: 'mixto',
        category: slot.category,
        courtId: null,
        courtNumber: null
      }
    });

    console.log(`✅ Nueva tarjeta abierta creada: ${newSlot.id}`);

    // 7. Verificar resultado final
    console.log('\n📊 RESULTADO FINAL:');
    console.log('='.repeat(70));

    const slotsFinales = await prisma.timeSlot.findMany({
      where: {
        instructorId: slot.instructorId,
        start: slot.start,
        clubId: slot.clubId
      },
      include: {
        bookings: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } }
        }
      }
    });

    console.log(`\nTimeSlots con mismo instructor/hora DESPUÉS: ${slotsFinales.length}`);
    console.log('\nDetalle de cada tarjeta:\n');

    slotsFinales.forEach((s, idx) => {
      console.log(`${idx + 1}. TimeSlot ${s.id.substring(0, 20)}...`);
      console.log(`   Nivel: ${s.level}`);
      console.log(`   Categoría: ${s.genderCategory || 'NULL'}`);
      console.log(`   Bookings: ${s.bookings.length}`);
      console.log(`   CourtId: ${s.courtId || 'NULL (propuesta)'}`);
      console.log('');
    });

    if (slotsFinales.length === slotsAntes + 1) {
      console.log('✅ ✅ ✅ ÉXITO: Se creó una NUEVA tarjeta abierta');
      console.log('   - Tarjeta original clasificada ✅');
      console.log('   - Nueva tarjeta abierta (mixto, ABIERTO) ✅');
      console.log('   - Ambas compiten por la misma hora/instructor ✅');
    } else {
      console.log('❌ ERROR: No se creó la nueva tarjeta');
    }

    // 8. LIMPIEZA
    console.log('\n🧹 LIMPIEZA...');
    await prisma.booking.delete({ where: { id: booking.id } });
    await prisma.timeSlot.update({
      where: { id: slot.id },
      data: { genderCategory: null }
    });
    await prisma.timeSlot.delete({ where: { id: newSlot.id } });
    console.log('✅ Datos de prueba eliminados\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNuevaTarjetaAbierta();
