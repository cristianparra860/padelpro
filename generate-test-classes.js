const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateTestClasses() {
  try {
    console.log('🏗️ GENERANDO CLASES DE PRUEBA PARA 2025-12-05\n');
    
    // Fecha de hoy: 2025-12-05
    const today = new Date('2025-12-05T00:00:00Z');
    
    // Buscar un instructor
    const instructor = await prisma.instructor.findFirst({
      select: { id: true, userId: true }
    });
    
    if (!instructor) {
      console.log('❌ No hay instructores en la base de datos');
      return;
    }
    
    console.log('✅ Instructor encontrado:', instructor.id);
    
    // Crear 3 TimeSlots para hoy
    const times = [
      { hour: 9, minute: 0 },   // 09:00
      { hour: 10, minute: 0 },  // 10:00
      { hour: 11, minute: 0 }   // 11:00
    ];
    
    const createdSlots = [];
    
    for (const time of times) {
      const startDate = new Date(Date.UTC(2025, 11, 5, time.hour, time.minute, 0));
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hora
      
      const slotId = `test-slot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await prisma.timeSlot.create({
        data: {
          id: slotId,
          start: startDate,
          end: endDate,
          clubId: 'padel-estrella-madrid',
          instructorId: instructor.id,
          level: 'intermedio',
          category: 'masculino',
          totalPrice: 2500, // 25€
          courtId: null, // Sin pista asignada (disponible)
          courtNumber: null
        }
      });
      
      createdSlots.push({
        id: slotId,
        time: `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`
      });
      
      console.log(`✅ Clase creada: ${time.hour}:${time.minute.toString().padStart(2, '0')} - ID: ${slotId}`);
    }
    
    console.log('\n✅ 3 clases creadas exitosamente para 2025-12-05');
    console.log('\n📝 TimeSlots creados:');
    createdSlots.forEach((slot, i) => {
      console.log(`   ${i+1}. ${slot.time} - ${slot.id}`);
    });
    
    console.log('\n💡 Ahora puedes inscribir a Marc en estas 3 clases');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

generateTestClasses();
