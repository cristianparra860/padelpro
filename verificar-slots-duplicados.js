const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('\n=== VERIFICANDO TIMESLOTS DEL DÍA 16 A LAS 7:00 ===\n');
    
    // Buscar todos los slots del 16 de noviembre a las 7:00
    const fecha = new Date('2025-11-16T07:00:00.000Z');
    const fechaFin = new Date('2025-11-16T08:00:00.000Z');
    
    const slots = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: fecha,
          lt: fechaFin
        }
      },
      include: {
        bookings: {
          include: {
            user: { select: { name: true } }
          }
        }
      }
    });
    
    console.log(`Total de slots encontrados: ${slots.length}\n`);
    
    if (slots.length === 0) {
      console.log('No se encontraron slots para esa fecha/hora');
    } else {
      slots.forEach((slot, index) => {
        console.log(`\n━━━ SLOT ${index + 1} ━━━`);
        console.log(`ID: ${slot.id}`);
        console.log(`Hora: ${new Date(Number(slot.start)).toLocaleString('es-ES')}`);
        console.log(`Club: ${slot.clubId}`);
        console.log(`Instructor: ${slot.instructorId}`);
        console.log(`Pista: ${slot.courtNumber || 'Sin asignar'}`);
        console.log(`Total reservas: ${slot.bookings.length}`);
        
        if (slot.bookings.length > 0) {
          slot.bookings.forEach(b => {
            console.log(`  - ${b.user.name}: ${b.status} (${b.groupSize} jugadores)`);
          });
        }
      });
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`RESUMEN:`);
      console.log(`- Total slots: ${slots.length}`);
      console.log(`- Slots con reservas: ${slots.filter(s => s.bookings.length > 0).length}`);
      console.log(`- Total reservas: ${slots.reduce((sum, s) => sum + s.bookings.length, 0)}`);
      
      const reservasActivas = slots.reduce((sum, s) => 
        sum + s.bookings.filter(b => b.status !== 'CANCELLED').length, 0
      );
      const reservasCanceladas = slots.reduce((sum, s) => 
        sum + s.bookings.filter(b => b.status === 'CANCELLED').length, 0
      );
      
      console.log(`- Reservas activas: ${reservasActivas}`);
      console.log(`- Reservas canceladas: ${reservasCanceladas}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
