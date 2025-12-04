const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkApiFormat() {
  try {
    console.log('🔍 Verificando formato de clases en la BD\n');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowTimestamp = tomorrow.getTime();
    
    // Buscar clases sin reservas
    const slots = await prisma.$queryRaw`
      SELECT * FROM TimeSlot 
      WHERE courtId IS NULL
      AND start >= ${todayTimestamp}
      AND start < ${tomorrowTimestamp}
      AND level = 'abierto'
      LIMIT 3
    `;
    
    console.log(`📋 Clases abiertas encontradas: ${slots.length}\n`);
    
    for (const slot of slots) {
      const slotTime = new Date(slot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      
      const bookingsCount = await prisma.booking.count({
        where: {
          timeSlotId: slot.id,
          status: { in: ['PENDING', 'CONFIRMED'] }
        }
      });
      
      console.log(`🎯 Clase ${slotTime} (${slot.id.substring(0,15)}...)`);
      console.log(`   level: "${slot.level}"`);
      console.log(`   levelRange: ${slot.levelRange || 'null'}`);
      console.log(`   genderCategory: ${slot.genderCategory || 'null'}`);
      console.log(`   reservas: ${bookingsCount}\n`);
    }
    
    console.log('✅ Estos son los campos que el frontend debería recibir del API');
    console.log('   cuando se hace una reserva y se actualiza el slot\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApiFormat();
