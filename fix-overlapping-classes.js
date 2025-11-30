// Script para eliminar clases solapadas y reservas múltiples del mismo usuario
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOverlappingIssues() {
  console.log('🔧 Solucionando problemas de solapamiento...\n');

  try {
    // 1. Obtener todas las clases solapadas
    const confirmedClasses = await prisma.$queryRaw`
      SELECT 
        id,
        courtNumber,
        start,
        end,
        instructorId
      FROM TimeSlot
      WHERE courtNumber IS NOT NULL
      ORDER BY courtNumber, start
    `;

    const overlappingIds = new Set();
    
    for (let i = 0; i < confirmedClasses.length; i++) {
      const class1 = confirmedClasses[i];
      const start1 = new Date(class1.start);
      const end1 = new Date(class1.end);
      
      for (let j = i + 1; j < confirmedClasses.length; j++) {
        const class2 = confirmedClasses[j];
        
        if (class1.courtNumber !== class2.courtNumber) continue;
        
        const start2 = new Date(class2.start);
        const end2 = new Date(class2.end);
        
        if (start1 < end2 && start2 < end1) {
          overlappingIds.add(class2.id); // Eliminar la segunda (más reciente)
        }
      }
    }

    console.log(`📊 Clases solapadas a eliminar: ${overlappingIds.size}\n`);

    if (overlappingIds.size > 0) {
      for (const id of overlappingIds) {
        console.log(`   ❌ Revirtiendo clase solapada a propuesta: ${id}`);
        
        // Cancelar bookings asociados y devolver créditos
        const bookings = await prisma.$queryRaw`
          SELECT id, userId, amountBlocked 
          FROM Booking 
          WHERE timeSlotId = ${id} 
          AND status = 'CONFIRMED'
        `;
        
        for (const booking of bookings) {
          console.log(`      💰 Devolviendo ${booking.amountBlocked / 100}€ a ${booking.userId}`);
          
          // Devolver créditos
          await prisma.$executeRaw`
            UPDATE User
            SET credits = credits + ${Number(booking.amountBlocked)}
            WHERE id = ${booking.userId}
          `;
          
          // Cancelar booking
          await prisma.$executeRaw`
            UPDATE Booking
            SET status = 'CANCELLED'
            WHERE id = ${booking.id}
          `;
        }
        
        // Eliminar registros de CourtSchedule e InstructorSchedule
        await prisma.$executeRaw`
          DELETE FROM CourtSchedule WHERE timeSlotId = ${id}
        `;
        
        await prisma.$executeRaw`
          DELETE FROM InstructorSchedule WHERE timeSlotId = ${id}
        `;
        
        // Revertir clase a propuesta (quitar pista asignada y reducir a 30 min)
        const slotInfo = await prisma.$queryRaw`
          SELECT start FROM TimeSlot WHERE id = ${id}
        `;
        
        if (slotInfo.length > 0) {
          const start = new Date(slotInfo[0].start);
          const newEnd = new Date(start.getTime() + 30 * 60 * 1000); // 30 minutos
          
          await prisma.$executeRaw`
            UPDATE TimeSlot
            SET courtId = NULL, courtNumber = NULL, end = ${newEnd.toISOString()}
            WHERE id = ${id}
          `;
        }
      }
    }

    // 2. Limpiar reservas múltiples del mismo usuario en el mismo día
    console.log('\n🔍 Buscando usuarios con múltiples reservas confirmadas...\n');
    
    const multipleBookings = await prisma.$queryRaw`
      SELECT 
        b.userId,
        DATE(ts.start) as bookingDate,
        GROUP_CONCAT(b.id) as bookingIds,
        COUNT(*) as bookingsCount
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.status = 'CONFIRMED'
      GROUP BY b.userId, DATE(ts.start)
      HAVING COUNT(*) > 1
    `;

    if (multipleBookings.length === 0) {
      console.log('✅ No hay usuarios con múltiples reservas');
    } else {
      for (const user of multipleBookings) {
        const bookingIds = user.bookingIds.split(',');
        console.log(`\n👤 Usuario ${user.userId}: ${user.bookingsCount} reservas`);
        
        // Mantener solo la PRIMERA reserva, cancelar el resto
        const [keepId, ...cancelIds] = bookingIds;
        console.log(`   ✅ Manteniendo: ${keepId}`);
        
        for (const cancelId of cancelIds) {
          console.log(`   ❌ Cancelando: ${cancelId}`);
          
          const booking = await prisma.booking.findUnique({
            where: { id: cancelId },
            select: { userId: true, amountBlocked: true, timeSlotId: true }
          });
          
          if (booking) {
            // Devolver créditos
            await prisma.$executeRaw`
              UPDATE User
              SET credits = credits + ${Number(booking.amountBlocked)}
              WHERE id = ${booking.userId}
            `;
            
            // Cancelar booking
            await prisma.$executeRaw`
              UPDATE Booking
              SET status = 'CANCELLED'
              WHERE id = ${cancelId}
            `;
            
            // Si el TimeSlot solo tenía este booking, eliminar la clase
            const remainingBookings = await prisma.$queryRaw`
              SELECT COUNT(*) as count
              FROM Booking
              WHERE timeSlotId = ${booking.timeSlotId}
              AND status = 'CONFIRMED'
            `;
            
            if (remainingBookings[0].count === 0) {
              console.log(`      🗑️ Eliminando clase sin bookings: ${booking.timeSlotId}`);
              await prisma.$executeRaw`
                DELETE FROM TimeSlot WHERE id = ${booking.timeSlotId}
              `;
            }
          }
        }
      }
    }

    console.log('\n✅ Limpieza completada!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOverlappingIssues();
