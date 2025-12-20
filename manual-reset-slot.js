const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function manualReset() {
  try {
    const timeSlotId = 'ts-1764307878219-r26v6ze0xzs';
    
    console.log(`\n🔍 Verificando TimeSlot: ${timeSlotId}\n`);
    
    // Ver estado actual
    const slot = await prisma.$queryRaw`
      SELECT * FROM TimeSlot WHERE id = ${timeSlotId}
    `;
    
    if (!slot || slot.length === 0) {
      console.log('❌ TimeSlot no encontrado');
      return;
    }
    
    console.log('Estado ANTES:');
    console.log(`   level: "${slot[0].level}"`);
    console.log(`   levelRange: "${slot[0].levelRange}"`);
    console.log(`   genderCategory: "${slot[0].genderCategory}"`);
    
    // Contar bookings activos
    const activeBookings = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM Booking 
      WHERE timeSlotId = ${timeSlotId}
      AND status IN ('PENDING', 'CONFIRMED')
    `;
    
    const count = activeBookings[0]?.count || 0;
    console.log(`\n📊 Bookings activos: ${count} (tipo: ${typeof count})\n`);
    
    if (count === 0 || count === '0' || Number(count) === 0) {
      console.log('🔄 Reseteando TimeSlot...\n');
      
      await prisma.$executeRaw`
        UPDATE TimeSlot
        SET genderCategory = NULL,
            level = 'abierto',
            levelRange = NULL,
            updatedAt = datetime('now')
        WHERE id = ${timeSlotId}
      `;
      
      console.log('✅ Reset completado\n');
      
      // Verificar cambio
      const slotAfter = await prisma.$queryRaw`
        SELECT * FROM TimeSlot WHERE id = ${timeSlotId}
      `;
      
      console.log('Estado DESPUÉS:');
      console.log(`   level: ${slotAfter[0].level === null ? 'NULL' : `"${slotAfter[0].level}"`}`);
      console.log(`   levelRange: ${slotAfter[0].levelRange === null ? 'NULL' : `"${slotAfter[0].levelRange}"`}`);
      console.log(`   genderCategory: ${slotAfter[0].genderCategory === null ? 'NULL' : `"${slotAfter[0].genderCategory}"`}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

manualReset();
