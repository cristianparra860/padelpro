const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateFutureClasses() {
  try {
    // Obtener instructores y pistas existentes
    const instructors = await prisma.instructor.findMany({ take: 3 });
    const courts = await prisma.court.findMany({ where: { clubId: 'padel-estrella-madrid' }, take: 3 });
    
    if (instructors.length === 0 || courts.length === 0) {
      console.log('❌ No hay instructores o pistas en la base de datos');
      return;
    }
    
    console.log(`📋 Instructores disponibles: ${instructors.length}`);
    console.log(`🏟️  Pistas disponibles: ${courts.length}`);
    
    const today = new Date('2025-12-09');
    const classes = [];
    
    // Generar 3 clases para hoy y mañana
    for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
      for (let hour of [10, 14, 18]) {
        const classDate = new Date(today);
        classDate.setDate(classDate.getDate() + dayOffset);
        classDate.setHours(hour, 0, 0, 0);
        
        const instructor = instructors[Math.floor(Math.random() * instructors.length)];
        const court = courts[Math.floor(Math.random() * courts.length)];
        
        // 50% de probabilidad de tener plazas recicladas
        const hasRecycled = Math.random() > 0.5;
        
        const classData = {
          id: `ts-future-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          clubId: 'padel-estrella-madrid',
          instructorId: instructor.id,
          start: classDate,
          end: new Date(classDate.getTime() + 90 * 60 * 1000),
          maxPlayers: 4,
          totalPrice: 20,
          instructorPrice: 15,
          courtRentalPrice: 5,
          level: 'abierto',
          category: 'general',
          courtNumber: court.number,
          courtId: court.id,
          hasRecycledSlots: hasRecycled,
          availableRecycledSlots: hasRecycled ? Math.floor(Math.random() * 3) + 1 : 0,
          recycledSlotsOnlyPoints: hasRecycled,
          creditsCost: 50
        };
        
        classes.push(classData);
      }
    }
    
    // Crear todas las clases
    let created = 0;
    let withRecycled = 0;
    
    for (const classData of classes) {
      try {
        const slot = await prisma.timeSlot.create({ data: classData });
        created++;
        if (slot.hasRecycledSlots) {
          withRecycled++;
          console.log(`✅ Clase con ${slot.availableRecycledSlots} plazas recicladas:`);
          console.log(`   ${slot.start.toLocaleString('es-ES')} - Pista ${slot.courtNumber}`);
        }
      } catch (err) {
        console.log(`⚠️  Error creando clase: ${err.message}`);
      }
    }
    
    console.log(`\n📊 Resumen:`);
    console.log(`   ${created} clases creadas`);
    console.log(`   ${withRecycled} clases con plazas recicladas`);
    console.log(`\n🎯 Ahora recarga http://localhost:9002/activities para ver los badges amarillos`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

generateFutureClasses();
