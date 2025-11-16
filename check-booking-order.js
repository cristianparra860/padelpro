const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookingOrder() {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        timeSlotId: 'cmhkwtltw002ptg7gkm2u521i'
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`📊 Reservas en el TimeSlot cmhkwtltw002ptg7gkm2u521i (09:00):\n`);
    
    bookings.forEach((b, idx) => {
      console.log(`${idx + 1}. ID: ${b.id}`);
      console.log(`   Created: ${b.createdAt}`);
      console.log(`   User: ${b.userId}`);
      console.log(`   Grupo: ${b.groupSize}`);
      console.log(`   Estado: ${b.status}`);
      console.log('');
    });
    
    // Verificar estado del TimeSlot
    const timeSlot = await prisma.timeSlot.findUnique({
      where: {
        id: 'cmhkwtltw002ptg7gkm2u521i'
      }
    });
    
    console.log('\n📅 Estado del TimeSlot:');
    console.log(`   Pista: ${timeSlot.courtNumber || 'SIN ASIGNAR'}`);
    console.log(`   Categoría: ${timeSlot.genderCategory || 'SIN ASIGNAR'}`);
    console.log(`   Nivel: ${timeSlot.level}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookingOrder();
