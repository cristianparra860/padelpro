// Corregir los amountBlocked existentes de euros a céntimos
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBlockedAmounts() {
  try {
    console.log('🔧 Iniciando corrección de amountBlocked...\n');
    
    // Obtener todas las bookings con amountBlocked < 100 (probablemente en euros)
    const bookingsToFix = await prisma.booking.findMany({
      where: {
        amountBlocked: {
          gt: 0,
          lt: 100 // Menos de 1 euro en céntimos = probablemente está en euros
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        timeSlot: {
          select: {
            start: true
          }
        }
      }
    });
    
    console.log(`📊 Encontradas ${bookingsToFix.length} bookings con amountBlocked < 100 (en euros)\n`);
    
    if (bookingsToFix.length === 0) {
      console.log('✅ No hay bookings que corregir');
      return;
    }
    
    // Corregir cada booking
    for (const booking of bookingsToFix) {
      const oldAmount = booking.amountBlocked;
      const newAmount = Math.round(oldAmount * 100); // Convertir euros a céntimos
      
      console.log(`📝 Booking ${booking.id}:`);
      console.log(`   Usuario: ${booking.user.name}`);
      console.log(`   Fecha: ${new Date(booking.timeSlot.start).toLocaleString('es-ES')}`);
      console.log(`   Anterior: ${oldAmount} (euros) → Nuevo: ${newAmount} céntimos (€${(newAmount/100).toFixed(2)})`);
      
      await prisma.booking.update({
        where: { id: booking.id },
        data: { amountBlocked: newAmount }
      });
      
      console.log(`   ✅ Corregido\n`);
    }
    
    console.log(`\n✅ Total de bookings corregidas: ${bookingsToFix.length}`);
    
    // Ahora recalcular el blockedCredits de cada usuario afectado
    console.log('\n🔄 Recalculando blockedCredits de usuarios afectados...\n');
    
    const affectedUserIds = [...new Set(bookingsToFix.map(b => b.userId))];
    
    for (const userId of affectedUserIds) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
      });
      
      console.log(`👤 Recalculando para ${user?.name} (${user?.email})...`);
      
      // Obtener todas las bookings PENDING sin courtId asignado
      const pendingBookings = await prisma.booking.findMany({
        where: {
          userId,
          status: 'PENDING',
          timeSlot: {
            courtId: null
          }
        },
        select: {
          amountBlocked: true
        }
      });
      
      const maxBlocked = pendingBookings.length > 0 
        ? Math.max(...pendingBookings.map(b => b.amountBlocked || 0))
        : 0;
      
      console.log(`   Bookings PENDING sin court: ${pendingBookings.length}`);
      console.log(`   Máximo amountBlocked: ${maxBlocked} céntimos (€${(maxBlocked/100).toFixed(2)})`);
      
      await prisma.user.update({
        where: { id: userId },
        data: { blockedCredits: maxBlocked }
      });
      
      console.log(`   ✅ blockedCredits actualizado\n`);
    }
    
    console.log('\n✅ Corrección completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBlockedAmounts();
