const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const inicio = new Date('2025-11-16T00:00:00Z');
  const fin = new Date('2025-11-16T23:59:59Z');
  
  console.log('\n=== TIMESLOTS CON COURTID (BLOQUES VERDES) PARA DÍA 16 ===\n');
  
  const slots = await prisma.timeSlot.findMany({
    where: {
      start: {
        gte: inicio,
        lte: fin
      },
      courtId: {
        not: null
      }
    },
    include: {
      bookings: {
        where: {
          status: {
            not: 'CANCELLED'
          }
        }
      },
      instructor: true
    }
  });
  
  console.log('Total TimeSlots con courtId asignado:', slots.length);
  console.log('');
  
  if (slots.length === 0) {
    console.log('✅ NO HAY bloques verdes para el día 16 (correcto)');
  } else {
    console.log('❌ SÍ HAY bloques verdes que NO deberían existir:\n');
    
    slots.forEach(s => {
      console.log(`📍 TimeSlot ID: ${s.id}`);
      console.log(`   Pista: ${s.courtNumber}`);
      console.log(`   Hora: ${new Date(s.start).toLocaleString('es-ES')}`);
      console.log(`   Instructor: ${s.instructor?.name || 'N/A'}`);
      console.log(`   CourtId: ${s.courtId}`);
      console.log(`   Bookings activos: ${s.bookings.length}`);
      if (s.bookings.length > 0) {
        s.bookings.forEach(b => {
          console.log(`      - Booking: ${b.userId}, Status: ${b.status}`);
        });
      } else {
        console.log(`   ⚠️ NO TIENE BOOKINGS - courtId debería ser NULL`);
      }
      console.log('');
    });
  }
  
  await prisma.$disconnect();
}

main();
