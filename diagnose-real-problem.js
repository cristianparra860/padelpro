const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseRealProblem() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DEL PROBLEMA\n');
  console.log('=' .repeat(60));
  
  const clubId = 'padel-estrella-madrid';
  const today = '2025-11-24';
  
  // 1. InstructorSchedule (lo que muestra el calendario admin)
  console.log('\n📅 PASO 1: InstructorSchedule (Calendario Admin)');
  console.log('-'.repeat(60));
  
  const schedules = await prisma.instructorSchedule.findMany({
    where: {
      instructor: {
        club: {
          id: clubId
        }
      },
      date: {
        gte: new Date(today + 'T00:00:00.000Z'),
        lte: new Date(today + 'T23:59:59.999Z')
      }
    },
    include: {
      instructor: true
    }
  });
  
  console.log(`✅ Total InstructorSchedule para hoy: ${schedules.length}`);
  if (schedules.length > 0) {
    console.log('\n📋 Muestra de schedules:');
    schedules.slice(0, 5).forEach((s, i) => {
      const date = new Date(s.date);
      console.log(`   ${i+1}. ${s.instructor?.name || 'Sin instructor'} | ${date.toISOString().substring(11, 16)} | Estado: ${s.status}`);
    });
  }
  
  // 2. TimeSlot (las tarjetas de clase)
  console.log('\n\n🎴 PASO 2: TimeSlot (Tarjetas de Clase)');
  console.log('-'.repeat(60));
  
  const timeSlots = await prisma.timeSlot.findMany({
    where: {
      clubId,
      start: {
        gte: new Date(today + 'T00:00:00.000Z'),
        lte: new Date(today + 'T23:59:59.999Z')
      }
    },
    include: {
      instructor: true,
      bookings: {
        where: {
          status: {
            not: 'CANCELLED'
          }
        }
      }
    }
  });
  
  console.log(`✅ Total TimeSlot para hoy: ${timeSlots.length}`);
  
  if (timeSlots.length > 0) {
    console.log('\n📋 Todos los TimeSlots de hoy:');
    timeSlots.forEach((slot, i) => {
      const startDate = new Date(slot.start);
      const hour = startDate.toISOString().substring(11, 16);
      console.log(`   ${i+1}. ${slot.instructor?.name || 'Sin instructor'} | ${hour} | ${slot.level} | ${slot.genderCategory || 'sin género'} | Reservas: ${slot.bookings.length} | CourtID: ${slot.courtId ? 'Asignada' : 'NULL'}`);
    });
  }
  
  // 3. Bookings activas para hoy
  console.log('\n\n📝 PASO 3: Bookings Activas');
  console.log('-'.repeat(60));
  
  const bookings = await prisma.booking.findMany({
    where: {
      timeSlot: {
        clubId,
        start: {
          gte: new Date(today + 'T00:00:00.000Z'),
          lte: new Date(today + 'T23:59:59.999Z')
        }
      },
      status: {
        not: 'CANCELLED'
      }
    },
    include: {
      user: true,
      timeSlot: {
        include: {
          instructor: true
        }
      }
    }
  });
  
  console.log(`✅ Total Bookings activas hoy: ${bookings.length}`);
  
  if (bookings.length > 0) {
    console.log('\n📋 Todas las bookings:');
    bookings.forEach((b, i) => {
      const hour = new Date(b.timeSlot.start).toISOString().substring(11, 16);
      console.log(`   ${i+1}. Usuario: ${b.user.name} | Clase: ${hour} ${b.timeSlot.instructor?.name} | Estado: ${b.status} | GroupSize: ${b.groupSize}`);
    });
  }
  
  // 4. ANÁLISIS COMPARATIVO
  console.log('\n\n🎯 PASO 4: ANÁLISIS COMPARATIVO');
  console.log('='.repeat(60));
  
  console.log(`\n📊 Resumen:`);
  console.log(`   - InstructorSchedule (Calendario): ${schedules.length} entradas`);
  console.log(`   - TimeSlot (Tarjetas): ${timeSlots.length} entradas`);
  console.log(`   - Bookings activas: ${bookings.length} reservas`);
  
  if (schedules.length > timeSlots.length) {
    console.log(`\n⚠️ PROBLEMA ENCONTRADO:`);
    console.log(`   Hay ${schedules.length - timeSlots.length} schedules que NO se han convertido en TimeSlots`);
    console.log(`   Esto explica por qué el calendario muestra más clases que las tarjetas`);
  } else if (timeSlots.length > schedules.length) {
    console.log(`\n⚠️ INCONSISTENCIA:`);
    console.log(`   Hay MÁS TimeSlots que schedules. Puede haber datos huérfanos.`);
  } else {
    console.log(`\n✅ Las cantidades coinciden`);
  }
  
  // 5. Verificar "reservas fantasma"
  console.log('\n\n👻 PASO 5: Verificar Reservas Fantasma');
  console.log('-'.repeat(60));
  
  const orphanBookings = await prisma.booking.findMany({
    where: {
      status: {
        not: 'CANCELLED'
      }
    },
    include: {
      timeSlot: true
    }
  });
  
  const invalidBookings = orphanBookings.filter(b => !b.timeSlot || !b.timeSlot.clubId);
  
  if (invalidBookings.length > 0) {
    console.log(`⚠️ ENCONTRADAS ${invalidBookings.length} reservas fantasma (booking sin TimeSlot válido)`);
    invalidBookings.forEach((b, i) => {
      console.log(`   ${i+1}. Booking ID: ${b.id} | TimeSlot: ${b.timeSlotId} | Estado: ${b.status}`);
    });
  } else {
    console.log(`✅ No hay reservas fantasma`);
  }
  
  await prisma.$disconnect();
}

diagnoseRealProblem();
