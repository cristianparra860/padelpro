const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignTimeSlotsToCarlos() {
  try {
    // Buscar Carlos Ruiz
    const carlos = await prisma.user.findFirst({
      where: { email: 'instructor@padelpro.com' }
    });
    
    console.log('👨‍🏫 Carlos Ruiz ID:', carlos.id);
    
    // Buscar TimeSlots sin confirmar (sin courtId) que estén disponibles
    const availableSlots = await prisma.timeSlot.findMany({
      where: {
        courtId: null, // Sin pista asignada (propuestas)
        start: { gte: new Date() } // Futuras
      },
      take: 50,
      orderBy: { start: 'asc' }
    });
    
    console.log(`\n📅 TimeSlots disponibles encontrados: ${availableSlots.length}`);
    
    // Asignar 30 TimeSlots a Carlos Ruiz
    const slotsToAssign = availableSlots.slice(0, 30);
    
    console.log(`\n🔄 Asignando ${slotsToAssign.length} TimeSlots a Carlos Ruiz...`);
    
    // Obtener el ID del instructor de Carlos Ruiz
    const instructor = await prisma.instructor.findFirst({
      where: { userId: carlos.id }
    });
    
    if (!instructor) {
      console.log('❌ No se encontró el registro de instructor para Carlos');
      return;
    }
    
    console.log(`   Instructor ID: ${instructor.id}`);
    
    // Usar SQL crudo para actualizar los TimeSlots
    const slotIds = slotsToAssign.map(s => s.id);
    
    // Actualizar en lotes de 10
    for (let i = 0; i < slotIds.length; i += 10) {
      const batch = slotIds.slice(i, i + 10);
      const placeholders = batch.map(() => '?').join(',');
      
      await prisma.$executeRawUnsafe(
        `UPDATE TimeSlot SET instructorId = ? WHERE id IN (${placeholders})`,
        instructor.id,
        ...batch
      );
      
      console.log(`   ✅ Asignados ${Math.min(i + 10, slotIds.length)} / ${slotIds.length} TimeSlots...`);
    }
    
    console.log(`\n✅ Total asignados: ${slotIds.length} TimeSlots a Carlos Ruiz`);
    
    // Mostrar ejemplos
    console.log('\n📋 Ejemplos de TimeSlots asignados:');
    for (const slot of slotsToAssign.slice(0, 5)) {
      const startDate = new Date(Number(slot.start));
      console.log(`   - ${startDate.toLocaleString('es-ES')} (ID: ${slot.id.substring(0, 15)}...)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

assignTimeSlotsToCarlos();
