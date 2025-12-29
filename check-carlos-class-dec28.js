const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClass() {
  try {
    console.log('\n🔍 Buscando clase de Carlos Rodriguez el 28 de diciembre a las 10:00...\n');
    
    // Buscar instructor Carlos Rodriguez
    const carlos = await prisma.instructor.findFirst({
      where: {
        name: {
          contains: 'Carlos',
          mode: 'insensitive'
        }
      }
    });
    
    if (!carlos) {
      console.log('❌ No se encontró instructor Carlos Rodriguez');
      return;
    }
    
    console.log('✅ Instructor encontrado:', carlos.name, 'ID:', carlos.id);
    
    // Buscar TimeSlots del 28 de diciembre a las 10:00 con este instructor
    const dec28 = new Date('2025-12-28T10:00:00');
    const startTime = dec28.getTime();
    
    console.log('\n🔍 Buscando TimeSlots con start:', startTime, '(', new Date(startTime).toLocaleString(), ')');
    
    const timeSlots = await prisma.timeSlot.findMany({
      where: {
        instructorId: carlos.id,
        start: startTime
      },
      include: {
        bookings: {
          include: {
            user: true
          }
        },
        court: true,
        instructor: true
      }
    });
    
    console.log('\n📊 TimeSlots encontrados:', timeSlots.length);
    
    if (timeSlots.length === 0) {
      console.log('❌ No se encontraron TimeSlots para Carlos el 28/12 a las 10:00');
      
      // Buscar todos los TimeSlots de Carlos ese día
      const allCarlosSlots = await prisma.timeSlot.findMany({
        where: {
          instructorId: carlos.id,
          start: {
            gte: new Date('2025-12-28T00:00:00').getTime(),
            lt: new Date('2025-12-29T00:00:00').getTime()
          }
        },
        include: {
          bookings: true
        }
      });
      
      console.log('\n📅 TimeSlots de Carlos el 28/12:', allCarlosSlots.length);
      allCarlosSlots.forEach(slot => {
        const start = new Date(slot.start);
        console.log(`   - ${start.getHours()}:${String(start.getMinutes()).padStart(2, '0')} | courtId: ${slot.courtId} | courtNumber: ${slot.courtNumber} | bookings: ${slot.bookings.length}`);
      });
      
      return;
    }
    
    // Mostrar detalles de cada TimeSlot encontrado
    timeSlots.forEach((slot, index) => {
      console.log(`\n📋 TimeSlot ${index + 1}:`);
      console.log('   ID:', slot.id);
      console.log('   Start:', new Date(slot.start).toLocaleString());
      console.log('   End:', new Date(slot.end).toLocaleString());
      console.log('   courtId:', slot.courtId);
      console.log('   courtNumber:', slot.courtNumber);
      console.log('   instructorId:', slot.instructorId);
      console.log('   Instructor:', slot.instructor?.name);
      console.log('   Court:', slot.court ? `${slot.court.name} (número ${slot.court.number})` : 'Sin pista');
      console.log('   levelRange:', slot.levelRange);
      console.log('   maxPlayers:', slot.maxPlayers);
      console.log('   totalPrice:', slot.totalPrice);
      console.log('   Bookings:', slot.bookings.length);
      
      slot.bookings.forEach((booking, i) => {
        console.log(`      ${i + 1}. ${booking.user?.name} - Status: ${booking.status}`);
      });
      
      // Verificar si debería aparecer en el calendario
      console.log('\n🔬 Análisis para calendario:');
      console.log('   ¿Tiene courtId?', slot.courtId ? '✅ SÍ' : '❌ NO');
      console.log('   ¿Tiene courtNumber?', slot.courtNumber ? '✅ SÍ' : '❌ NO');
      console.log('   ¿Tiene bookings?', slot.bookings.length > 0 ? '✅ SÍ' : '❌ NO');
      
      if (!slot.courtId && !slot.courtNumber) {
        console.log('\n⚠️  PROBLEMA: Esta clase NO aparecerá en el calendario porque no tiene courtId ni courtNumber asignado');
        console.log('   Solución: Asignar courtId a esta clase');
      } else {
        console.log('\n✅ Esta clase DEBERÍA aparecer en el calendario');
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClass();
