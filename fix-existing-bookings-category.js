const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixExistingBookings() {
  try {
    console.log('🔧 Reparando TimeSlots sin categoría que tienen reservas\n');
    
    // Buscar TimeSlots sin categoría que tienen reservas
    const timeSlotsWithoutCategory = await prisma.$queryRaw`
      SELECT DISTINCT ts.id, ts.start, ts.level
      FROM TimeSlot ts
      INNER JOIN Booking b ON ts.id = b.timeSlotId
      WHERE (ts.genderCategory IS NULL OR ts.genderCategory = 'abierto')
      AND b.status IN ('PENDING', 'CONFIRMED')
      ORDER BY ts.start ASC
    `;
    
    console.log(`📊 Encontrados ${timeSlotsWithoutCategory.length} TimeSlots sin categoría con reservas\n`);
    
    for (const slot of timeSlotsWithoutCategory) {
      console.log(`\n📅 TimeSlot: ${slot.id}`);
      console.log(`   Fecha: ${slot.start}`);
      
      // Obtener la primera reserva (la más antigua)
      const firstBooking = await prisma.$queryRaw`
        SELECT b.userId, b.createdAt, u.gender, u.name
        FROM Booking b
        JOIN User u ON b.userId = u.id
        WHERE b.timeSlotId = ${slot.id}
        AND b.status IN ('PENDING', 'CONFIRMED')
        ORDER BY b.createdAt ASC
        LIMIT 1
      `;
      
      if (firstBooking && firstBooking.length > 0) {
        const { gender, name } = firstBooking[0];
        const classCategory = gender === 'masculino' ? 'masculino' : 
                            gender === 'femenino' ? 'femenino' : 
                            'mixto';
        
        console.log(`   👤 Primera reserva: ${name} (${gender || 'sin género'})`);
        console.log(`   🏷️ Estableciendo categoría: ${classCategory}`);
        
        // Actualizar el TimeSlot
        await prisma.$executeRaw`
          UPDATE TimeSlot 
          SET genderCategory = ${classCategory}, updatedAt = datetime('now')
          WHERE id = ${slot.id}
        `;
        
        console.log(`   ✅ Categoría actualizada`);
      }
    }
    
    console.log('\n\n✅ Proceso completado');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixExistingBookings();
