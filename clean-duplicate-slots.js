const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDuplicates() {
  console.log('🧹 Limpiando TimeSlots duplicados...\n');
  
  try {
    // 1. Obtener todos los TimeSlots sin confirmar (courtId = null)
    const slots = await prisma.timeSlot.findMany({
      where: {
        courtId: null
      },
      select: {
        id: true,
        instructorId: true,
        start: true,
        levelRange: true,
        bookings: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: [
        { instructorId: 'asc' },
        { start: 'asc' }
      ]
    });
    
    console.log(`📊 Total TimeSlots sin confirmar: ${slots.length}\n`);
    
    // 2. Agrupar por instructor + hora
    const groups = new Map();
    
    slots.forEach(slot => {
      const hour = new Date(slot.start).toISOString().substring(0, 16); // YYYY-MM-DDTHH:MM
      const key = `${slot.instructorId}-${hour}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(slot);
    });
    
    console.log(`🔍 Grupos únicos: ${groups.size}`);
    console.log(`🔍 Grupos con duplicados: ${Array.from(groups.values()).filter(g => g.length > 1).length}\n`);
    
    // 3. Procesar duplicados
    let deletedCount = 0;
    
    for (const [key, groupSlots] of groups.entries()) {
      if (groupSlots.length > 1) {
        console.log(`\n⚠️  Duplicados en ${key}:`);
        
        // Ordenar por prioridad:
        // 1. Con bookings activos primero
        // 2. Con levelRange definido
        // 3. Más reciente (por ID)
        const sorted = groupSlots.sort((a, b) => {
          const aActiveBookings = a.bookings.filter(b => b.status !== 'CANCELLED').length;
          const bActiveBookings = b.bookings.filter(b => b.status !== 'CANCELLED').length;
          
          if (aActiveBookings !== bActiveBookings) {
            return bActiveBookings - aActiveBookings; // Más bookings primero
          }
          
          if (a.levelRange && !b.levelRange) return -1;
          if (!a.levelRange && b.levelRange) return 1;
          
          return b.id.localeCompare(a.id); // Más reciente
        });
        
        const toKeep = sorted[0];
        const toDelete = sorted.slice(1);
        
        console.log(`   ✅ Mantener: ${toKeep.id.substring(0, 8)}... (${toKeep.levelRange || 'N/A'}, ${toKeep.bookings.filter(b => b.status !== 'CANCELLED').length} bookings)`);
        
        for (const slot of toDelete) {
          console.log(`   ❌ Eliminar: ${slot.id.substring(0, 8)}... (${slot.levelRange || 'N/A'}, ${slot.bookings.filter(b => b.status !== 'CANCELLED').length} bookings)`);
          
          // Primero eliminar bookings asociados
          await prisma.booking.deleteMany({
            where: { timeSlotId: slot.id }
          });
          
          // Luego eliminar el TimeSlot
          await prisma.timeSlot.delete({
            where: { id: slot.id }
          });
          
          deletedCount++;
        }
      }
    }
    
    console.log(`\n✅ Proceso completado:`);
    console.log(`   - TimeSlots eliminados: ${deletedCount}`);
    console.log(`   - TimeSlots conservados: ${slots.length - deletedCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDuplicates();
