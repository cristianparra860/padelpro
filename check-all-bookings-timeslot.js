const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllBookingsForSlot() {
  const timeSlotId = 'cmhkwtlua002vtg7gmx4t1tet';
  
  console.log('🔍 Verificando TODAS las reservas para TimeSlot 10:30\n');
  
  // Buscar todas las reservas (incluyendo canceladas)
  const allBookings = await prisma.booking.findMany({
    where: { timeSlotId },
    include: { user: true },
    orderBy: { createdAt: 'asc' }
  });
  
  console.log(`📚 Total reservas (incluyendo canceladas): ${allBookings.length}\n`);
  
  allBookings.forEach((b, i) => {
    console.log(`${i+1}. Reserva ID: ${b.id}`);
    console.log(`   Usuario: ${b.user.name}`);
    console.log(`   Creada: ${new Date(b.createdAt).toLocaleString()}`);
    console.log(`   Tamaño grupo: ${b.groupSize}`);
    console.log(`   Estado: ${b.status}`);
    console.log(`   Monto: €${b.amountBlocked/100}\n`);
  });
  
  // Verificar si la de Alex fue la primera
  const alexBooking = allBookings.find(b => b.id === 'booking-1762447761205-vom35tb29');
  if (alexBooking) {
    const isFirst = allBookings[0].id === alexBooking.id;
    console.log(`¿La reserva de Alex fue la primera? ${isFirst ? 'SÍ ✅' : 'NO ❌'}`);
    
    if (!isFirst) {
      console.log(`Primera reserva fue: ${allBookings[0].id} por ${allBookings[0].user.name}`);
    }
  }
  
  await prisma.$disconnect();
}

checkAllBookingsForSlot().catch(console.error);
