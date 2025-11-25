import { prisma } from './src/lib/prisma.ts';

async function generateTimeSlotsForDay(date) {
  const clubId = 'padel-estrella-madrid';
  
  console.log(`📅 Generando TimeSlots para: ${date}\n`);
  
  // Obtener todos los instructores activos
  const instructors = await prisma.instructor.findMany({
    where: { isActive: true }
  });
  
  console.log(`👨‍🏫 Instructores activos: ${instructors.length}\n`);
  
  let created = 0;
  
  // Generar slots cada 30 minutos de 07:00 a 21:30
  for (let hour = 7; hour <= 21; hour++) {
    for (let minute of [0, 30]) {
      if (hour === 21 && minute === 30) continue; // No generar después de 21:00
      
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Para cada instructor, crear un TimeSlot
      for (const instructor of instructors) {
        const startDateTime = new Date(`${date}T${time}:00.000Z`);
        const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000); // +30 minutos
        
        const timeSlotId = `ts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        try {
          await prisma.timeSlot.create({
            data: {
              id: timeSlotId,
              clubId,
              instructorId: instructor.id,
              start: startDateTime,
              end: endDateTime,
              maxPlayers: 4,
              totalPrice: 25,
              instructorPrice: 15,
              courtRentalPrice: 10,
              level: 'ABIERTO',
              category: 'clase',
              genderCategory: 'mixto'
            }
          });
          
          created++;
          
          if (created % 10 === 0) {
            process.stdout.write('.');
          }
        } catch (error) {
          // Ignorar duplicados
        }
      }
    }
  }
  
  console.log(`\n\n✅ Creados: ${created} TimeSlots`);
}

async function main() {
  try {
    console.log('🤖 GENERADOR DIRECTO DE TIMESLOTS\n');
    
    // Generar para hoy
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Generar para mañana también
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    await generateTimeSlotsForDay(todayStr);
    await generateTimeSlotsForDay(tomorrowStr);
    
    // Verificar
    const total = await prisma.timeSlot.count();
    console.log(`\n📊 Total TimeSlots en base de datos: ${total}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
