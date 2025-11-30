const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createBooking() {
  try {
    const userId = 'user-1763677110798-mq6nvxq88'; // María García
    
    // Verificar saldo actual
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, credits: true, points: true }
    });
    
    console.log('👤 Usuario:', user.name);
    console.log('💰 Saldo actual: €' + user.credits);
    console.log('🏆 Puntos actuales:', user.points);
    
    if (user.credits < 10) {
      console.log('\n❌ Usuario no tiene suficientes créditos. Agregando 100€...');
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: 100 } }
      });
      console.log('✅ Créditos agregados');
    }
    
    // Obtener instructor y court
    const instructor = await prisma.instructor.findFirst();
    const court = await prisma.court.findFirst();
    
    if (!instructor || !court) {
      console.log('❌ No hay instructores o canchas disponibles');
      return;
    }
    
    // Crear TimeSlot para mañana a las 11:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(12, 0, 0, 0);
    
    const timeSlot = await prisma.timeSlot.create({
      data: {
        clubId: instructor.clubId,
        instructorId: instructor.id,
        start: tomorrow,
        end: endTime,
        totalPrice: 10,
        maxPlayers: 4,
        level: 'INTERMEDIO',
        category: 'mixto'
      }
    });
    
    console.log('\n✅ TimeSlot creado:', timeSlot.id);
    console.log('   Fecha:', tomorrow.toLocaleString('es-ES'));
    console.log('   Precio: €' + timeSlot.totalPrice);
    
    // Asignar court al TimeSlot (esto marca la clase como confirmada)
    await prisma.timeSlot.update({
      where: { id: timeSlot.id },
      data: { courtId: court.id }
    });
    
    // Crear Booking CONFIRMED
    const booking = await prisma.booking.create({
      data: {
        userId: userId,
        timeSlotId: timeSlot.id,
        groupSize: 4,
        status: 'CONFIRMED',
        amountBlocked: 10
      }
    });
    
    console.log('\n✅ Booking CONFIRMED creado:', booking.id);
    console.log('   Usuario:', user.name);
    console.log('   Amount: €' + booking.amountBlocked);
    console.log('   Status:', booking.status);
    console.log('   Court:', court.number);
    
    // Cobrar el dinero
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 10 } }
    });
    
    // Registrar transacción de pago
    const { createTransaction } = require('./src/lib/transactionLogger');
    const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
    
    await createTransaction({
      userId,
      type: 'credit',
      action: 'subtract',
      amount: 10,
      balance: updatedUser.credits,
      concept: `Clase confirmada - ${tomorrow.toLocaleDateString('es-ES')}, ${tomorrow.toLocaleTimeString('es-ES')}`,
      relatedId: booking.id,
      relatedType: 'booking'
    });
    
    console.log('\n💰 Créditos actualizados: -€10 (ya cobrado)');
    console.log('✅ Transacción de pago registrada');
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 BOOKING LISTO PARA PROBAR CANCELACIÓN');
    console.log('='.repeat(60));
    console.log('Booking ID:', booking.id);
    console.log('Usuario:', user.name, '(' + user.email + ')');
    console.log('Fecha:', tomorrow.toLocaleDateString('es-ES'), 'a las', tomorrow.toLocaleTimeString('es-ES'));
    console.log('\n👉 Entra con este usuario y cancela la clase desde "Mis Reservas"');
    console.log('👉 Deberías recibir 10 PUNTOS (no dinero)');
    console.log('👉 La transacción debe aparecer en el panel de puntos');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createBooking();
