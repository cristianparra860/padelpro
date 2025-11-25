const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cancelPendingBookingsWithConfirmedSameDay() {
  try {
    console.log('🔍 Buscando usuarios con reservas CONFIRMED...\n');
    
    // Obtener todas las reservas CONFIRMED
    const confirmedBookings = await prisma.$queryRaw`
      SELECT DISTINCT b.userId, ts.start, b.timeSlotId
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.status = 'CONFIRMED'
      ORDER BY ts.start ASC
    `;
    
    console.log(`📊 Total reservas confirmadas: ${confirmedBookings.length}\n`);
    
    let totalCancelled = 0;
    
    for (const confirmed of confirmedBookings) {
      const userId = confirmed.userId;
      const confirmedTimeSlotId = confirmed.timeSlotId;
      const slotDate = new Date(confirmed.start);
      
      const startOfDayDate = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), 0, 0, 0, 0));
      const endOfDayDate = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), 23, 59, 59, 999));
      const startOfDay = startOfDayDate.toISOString();
      const endOfDay = endOfDayDate.toISOString();
      
      // Buscar inscripciones PENDING del mismo día
      const pendingBookings = await prisma.$queryRaw`
        SELECT b.id, b.amountBlocked, ts.start
        FROM Booking b
        JOIN TimeSlot ts ON b.timeSlotId = ts.id
        WHERE b.userId = ${userId}
        AND b.status = 'PENDING'
        AND b.timeSlotId != ${confirmedTimeSlotId}
        AND ts.start >= ${startOfDay}
        AND ts.start <= ${endOfDay}
      `;
      
      if (pendingBookings.length > 0) {
        console.log(`\n👤 Usuario ${userId.substring(0, 8)}:`);
        console.log(`   ✅ Confirmada: ${new Date(confirmed.start).toLocaleString('es-ES')}`);
        console.log(`   📋 Pendientes a cancelar: ${pendingBookings.length}`);
        
        for (const pending of pendingBookings) {
          const pendingDate = new Date(pending.start);
          console.log(`      ❌ Cancelando: ${pendingDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
          
          // Cancelar
          await prisma.$executeRaw`
            UPDATE Booking 
            SET status = 'CANCELLED', updatedAt = datetime('now')
            WHERE id = ${pending.id}
          `;
          
          totalCancelled++;
        }
        
        // Recalcular blockedCredits
        const userBookings = await prisma.booking.findMany({
          where: { userId, status: 'PENDING' },
          select: { amountBlocked: true }
        });
        
        const newBlocked = userBookings.reduce((sum, b) => sum + b.amountBlocked, 0);
        
        await prisma.user.update({
          where: { id: userId },
          data: { blockedCredits: newBlocked }
        });
        
        console.log(`      💰 Créditos bloqueados actualizados: €${(newBlocked/100).toFixed(2)}`);
      }
    }
    
    console.log(`\n\n✅ Proceso completado`);
    console.log(`📊 Total inscripciones canceladas: ${totalCancelled}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cancelPendingBookingsWithConfirmedSameDay();
