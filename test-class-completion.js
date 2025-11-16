const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testClassCompletion() {
  try {
    console.log('🧪 TESTING: Verificación de categoría y pista al completar clase\n');
    
    // Buscar clases completadas (con pista asignada)
    const completedClasses = await prisma.$queryRaw`
      SELECT 
        id,
        start,
        courtNumber,
        genderCategory,
        instructorId,
        level
      FROM TimeSlot
      WHERE courtNumber IS NOT NULL
      ORDER BY start ASC
      LIMIT 5
    `;
    
    console.log(`📊 Encontradas ${completedClasses.length} clases completadas:\n`);
    
    for (const clase of completedClasses) {
      const startDate = new Date(clase.start);
      const formattedDate = startDate.toLocaleString('es-ES', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      console.log(`📅 Clase: ${formattedDate}`);
      console.log(`   🎾 Pista: ${clase.courtNumber || '❌ SIN PISTA'}`);
      console.log(`   👥 Categoría: ${clase.genderCategory || '❌ SIN CATEGORÍA'}`);
      console.log(`   📚 Nivel: ${clase.level}`);
      
      // Obtener las reservas de esta clase
      const bookings = await prisma.$queryRaw`
        SELECT 
          b.id,
          b.userId,
          b.groupSize,
          b.status,
          u.name,
          u.gender
        FROM Booking b
        JOIN User u ON b.userId = u.id
        WHERE b.timeSlotId = ${clase.id}
        ORDER BY b.createdAt ASC
      `;
      
      console.log(`   👤 Jugadores (${bookings.length}):`);
      bookings.forEach((booking, idx) => {
        console.log(`      ${idx + 1}. ${booking.name} - Género: ${booking.gender || 'NO DEFINIDO'} - Grupo: ${booking.groupSize} - Estado: ${booking.status}`);
      });
      
      // Verificar coherencia
      if (!clase.genderCategory) {
        console.log(`   ⚠️  PROBLEMA: Clase tiene pista pero NO tiene categoría de género`);
      } else if (clase.courtNumber) {
        console.log(`   ✅ Clase correctamente configurada con pista Y categoría`);
      }
      
      console.log('');
    }
    
    // Buscar clases SIN pista pero CON reservas (propuestas con jugadores)
    console.log('\n📋 Verificando propuestas pendientes de completarse:\n');
    
    const proposalsWithBookings = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.courtNumber,
        ts.genderCategory,
        COUNT(b.id) as bookingCount
      FROM TimeSlot ts
      LEFT JOIN Booking b ON ts.id = b.timeSlotId AND b.status IN ('PENDING', 'CONFIRMED')
      WHERE ts.courtNumber IS NULL
      AND ts.start >= datetime('now')
      GROUP BY ts.id
      HAVING COUNT(b.id) > 0
      ORDER BY ts.start ASC
      LIMIT 5
    `;
    
    if (proposalsWithBookings.length === 0) {
      console.log('   ℹ️  No hay propuestas con reservas pendientes\n');
    } else {
      console.log(`📊 Encontradas ${proposalsWithBookings.length} propuestas con reservas:\n`);
      
      for (const proposal of proposalsWithBookings) {
        const startDate = new Date(proposal.start);
        const formattedDate = startDate.toLocaleString('es-ES', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        console.log(`📅 Propuesta: ${formattedDate}`);
        console.log(`   📊 Reservas: ${proposal.bookingCount}`);
        console.log(`   👥 Categoría: ${proposal.genderCategory || '❌ SIN CATEGORÍA'}`);
        
        // Obtener detalles de las reservas
        const bookings = await prisma.$queryRaw`
          SELECT 
            b.groupSize,
            u.name,
            u.gender
          FROM Booking b
          JOIN User u ON b.userId = u.id
          WHERE b.timeSlotId = ${proposal.id}
          AND b.status IN ('PENDING', 'CONFIRMED')
        `;
        
        console.log(`   👤 Jugadores:`);
        bookings.forEach((b, idx) => {
          console.log(`      ${idx + 1}. ${b.name} (${b.gender || 'NO DEFINIDO'}) - Grupo de ${b.groupSize}`);
        });
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testClassCompletion();
