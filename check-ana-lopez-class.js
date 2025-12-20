const { PrismaClient } = require('@prisma/client');const { PrismaClient } = require('@prisma/client');






























































































checkAnaLopezClass();}  }    await prisma.$disconnect();  } finally {    console.error('❌ Error:', error);  } catch (error) {        }      console.log('   Verificar que el booking tenga isRecycled=true');      console.log('\n❌ NO HAY PLAZAS RECICLADAS');    } else {      console.log(`   → Otras modalidades deben estar BLOQUEADAS`);      console.log(`   → Modalidad de ${cancelledRecycled[0].groupSize} jugador(es) debe mostrar badge de puntos`);      console.log(`   GroupSize cancelado: ${cancelledRecycled[0].groupSize}`);      console.log('   Esta clase DEBE aparecer en panel principal con badge amarillo');      console.log('\n✅ CLASE CON PLAZAS RECICLADAS');    if (cancelledRecycled.length > 0) {        console.log(`   Activas: ${activeBookings.length}`);    console.log(`   Canceladas recicladas: ${cancelledRecycled.length}`);    console.log(`   Total bookings: ${timeSlot.bookings.length}`);    console.log('\n🔍 Análisis:');        const activeBookings = timeSlot.bookings.filter(b => b.status !== 'CANCELLED');    const cancelledRecycled = timeSlot.bookings.filter(b => b.status === 'CANCELLED' && b.isRecycled === true);        });      console.log(`   - ${b.user.name}: ${b.status} | groupSize: ${b.groupSize} | isRecycled: ${b.isRecycled} | wasConfirmed: ${b.wasConfirmed}`);    timeSlot.bookings.forEach(b => {    console.log('\n📋 Bookings:');        console.log(`   Category: ${timeSlot.genderCategory}`);    console.log(`   Level: ${timeSlot.level}`);    console.log(`   availableRecycledSlots: ${timeSlot.availableRecycledSlots}`);    console.log(`   hasRecycledSlots: ${timeSlot.hasRecycledSlots}`);    console.log(`   courtId: ${timeSlot.courtId}`);    console.log(`   Pista: ${timeSlot.courtNumber}`);    console.log(`   Fecha: ${new Date(Number(timeSlot.start)).toLocaleString('es-ES')}`);    console.log(`   ID: ${timeSlot.id}`);    console.log('\n📋 TimeSlot encontrado:');        }      return;      console.log('❌ No se encontró la clase');    if (!timeSlot) {        });      }        }          }            }              }                email: true                name: true,              select: {            user: {          include: {        bookings: {      include: {      },        courtNumber: 1        start: startTimestamp,        instructorId: anaInstructor.id,      where: {    const timeSlot = await prisma.timeSlot.findFirst({        const startTimestamp = date.getTime();    const date = new Date('2025-12-26T08:00:00.000Z'); // 09:00 en España    // Buscar TimeSlot del 26 de diciembre a las 09:00        console.log(`✅ Instructor encontrado: ${anaInstructor.name} (${anaInstructor.id})`);        }      return;      console.log('❌ No se encontró instructor Ana López');    if (!anaInstructor) {        });      }        }          contains: 'Ana'        name: {      where: {    const anaInstructor = await prisma.instructor.findFirst({    // Buscar instructor Ana López        console.log('\n🔍 Buscando clase de Ana López, Viernes 26 dic, 09:00, Pista 1...\n');  try {async function checkAnaLopezClass() {const prisma = new PrismaClient();const prisma = new PrismaClient();

async function checkAnaLopezClass() {
  try {
    console.log('\n🔍 Buscando clase de Ana López, Viernes 26 Diciembre, 09:00, Pista 1...\n');
    
    // Buscar instructor Ana López
    const instructor = await prisma.instructor.findFirst({
      where: {
        name: { contains: 'Ana' }
      }
    });
    
    if (!instructor) {
      console.log('❌ No se encontró instructor Ana López');
      return;
    }
    
    console.log(`✅ Instructor: ${instructor.name} (${instructor.id})`);
    
    // Buscar TimeSlot de esa fecha
    const date = new Date('2025-12-26T09:00:00.000Z');
    const startTimestamp = date.getTime();
    const endTimestamp = date.getTime() + (60 * 60 * 1000); // +1 hora
    
    const slots = await prisma.timeSlot.findMany({
      where: {
        instructorId: instructor.id,
        start: {
          gte: startTimestamp,
          lte: endTimestamp
        },
        courtNumber: 1
      },
      include: {
        bookings: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
    
    if (slots.length === 0) {
      console.log('❌ No se encontró TimeSlot para esa fecha/hora/pista');
      return;
    }
    
    console.log(`\n📊 Encontrados ${slots.length} TimeSlots:\n`);
    
    slots.forEach(slot => {
      console.log(`📍 TimeSlot ID: ${slot.id}`);
      console.log(`   Fecha: ${new Date(slot.start).toLocaleString('es-ES')}`);
      console.log(`   Pista: ${slot.courtNumber}`);
      console.log(`   courtId: ${slot.courtId || 'NULL'}`);
      console.log(`   hasRecycledSlots: ${slot.hasRecycledSlots}`);
      console.log(`   availableRecycledSlots: ${slot.availableRecycledSlots}`);
      console.log(`   Nivel: ${slot.levelRange || slot.level}`);
      console.log(`   Categoría: ${slot.genderCategory}`);
      
      console.log(`\n   📋 Bookings (${slot.bookings.length}):`);
      slot.bookings.forEach(b => {
        console.log(`      - ${b.user.name} (${b.user.email})`);
        console.log(`        Status: ${b.status}`);
        console.log(`        isRecycled: ${b.isRecycled}`);
        console.log(`        wasConfirmed: ${b.wasConfirmed}`);
        console.log(`        groupSize: ${b.groupSize}`);
        console.log('');
      });
      
      // Verificar si aparecería en /api/timeslots
      const hasRecycledBookings = slot.bookings.some(b => b.status === 'CANCELLED' && b.isRecycled);
      console.log(`\n   ✅ ¿Aparecería en /api/timeslots?`);
      console.log(`      - courtId es NULL: ${slot.courtId === null}`);
      console.log(`      - Tiene booking reciclado: ${hasRecycledBookings}`);
      console.log(`      - Debería aparecer: ${slot.courtId === null || hasRecycledBookings ? 'SÍ ✅' : 'NO ❌'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAnaLopezClass();
