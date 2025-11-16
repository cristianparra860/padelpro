// Eliminar todas las propuestas (courtId = NULL) y regenerarlas con la nueva duración de 60 minutos
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function regenerateProposals() {
  try {
    console.log('🗑️  Eliminando propuestas antiguas (courtId = NULL)...');
    
    // Primero eliminar bookings de propuestas
    console.log('   📦 Eliminando bookings de propuestas...');
    const deletedBookings = await prisma.$executeRaw`
      DELETE FROM Booking WHERE timeSlotId IN (
        SELECT id FROM TimeSlot WHERE courtId IS NULL
      )
    `;
    console.log(`   ✅ Eliminados ${deletedBookings} bookings`);
    
    // Ahora eliminar propuestas (courtId = NULL), no las confirmadas
    const deleted = await prisma.$executeRaw`
      DELETE FROM TimeSlot WHERE courtId IS NULL
    `;
    
    console.log(`✅ Eliminadas ${deleted} propuestas antiguas`);
    
    console.log('\n🔄 Regenerando propuestas con duración de 60 minutos...');
    
    // Llamar a la API de generación
    const response = await fetch('http://localhost:9002/api/cron/generate-cards?days=14');
    const result = await response.json();
    
    console.log('\n✅ Resultado:', result);
    console.log(`   📝 Creadas: ${result.created}`);
    console.log(`   ⏭️  Omitidas: ${result.skipped}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

regenerateProposals();
