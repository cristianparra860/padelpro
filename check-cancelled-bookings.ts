import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCancelledBookings() {
  console.log('🔍 Verificando reservas canceladas\n');
  
  // Contar bookings por estado
  const pending = await prisma.booking.count({
    where: { status: 'PENDING' }
  });
  
  const confirmed = await prisma.booking.count({
    where: { status: 'CONFIRMED' }
  });
  
  const cancelled = await prisma.booking.count({
    where: { status: 'CANCELLED' }
  });
  
  const total = await prisma.booking.count();
  
  console.log('📊 Reservas por estado:');
  console.log(`   PENDING: ${pending}`);
  console.log(`   CONFIRMED: ${confirmed}`);
  console.log(`   CANCELLED: ${cancelled}`);
  console.log(`   TOTAL: ${total}`);
  console.log('');
  
  if (cancelled > 0) {
    console.log('🗑️  Reservas canceladas encontradas:');
    const cancelledBookings = await prisma.booking.findMany({
      where: { status: 'CANCELLED' },
      include: {
        user: {
          select: { name: true, email: true }
        },
        timeSlot: {
          select: { start: true, level: true }
        }
      },
      take: 10
    });
    
    cancelledBookings.forEach((booking, index) => {
      console.log(`\n${index + 1}. Reserva ${booking.id}`);
      console.log(`   Usuario: ${booking.user.name}`);
      console.log(`   Clase: ${booking.timeSlot.start} - ${booking.timeSlot.level}`);
      console.log(`   Creada: ${booking.createdAt}`);
      console.log(`   Actualizada: ${booking.updatedAt}`);
    });
    
    console.log('\n¿Quieres eliminar las reservas CANCELLED? (manual)');
  } else {
    console.log('✅ No hay reservas canceladas en la base de datos');
  }
  
  await prisma.$disconnect();
}

checkCancelledBookings();
