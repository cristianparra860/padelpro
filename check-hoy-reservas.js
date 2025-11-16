const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Hoy es 16 de noviembre 2025
  const hoy = new Date('2025-11-16');
  const inicio = new Date(hoy.setHours(0,0,0,0));
  const fin = new Date(hoy.setHours(23,59,59,999));
  
  console.log('\n=== RESERVAS PARA HOY 16 NOVIEMBRE 2025 ===\n');
  console.log('Rango:', inicio.toISOString(), '-', fin.toISOString());
  
  const bookings = await prisma.booking.findMany({
    where: {
      timeSlot: {
        start: {
          gte: inicio,
          lte: fin
        }
      }
    },
    include: {
      timeSlot: true,
      user: true
    }
  });
  
  console.log('\nTotal reservas para hoy:', bookings.length);
  
  if (bookings.length > 0) {
    bookings.forEach(b => {
      console.log(`
Reserva ID: ${b.id}
Usuario: ${b.user.name}
Clase: ${new Date(b.timeSlot.start).toLocaleString('es-ES')}
Status: ${b.status}
GroupSize: ${b.groupSize || 1}
      `);
    });
  } else {
    console.log('\n✅ No hay reservas para hoy (correcto)');
  }
  
  await prisma.$disconnect();
}

main();
