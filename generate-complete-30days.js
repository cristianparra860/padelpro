import { prisma } from './src/lib/prisma.ts';

async function generateCompleteSchedule() {
  try {
    console.log('🤖 GENERADOR COMPLETO - 25 Nov al 24 Dic (30 días)\n');
    
    const clubId = 'padel-estrella-madrid';
    const startDate = new Date('2025-11-25');
    const endDate = new Date('2025-12-24');
    
    // Obtener instructores activos
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true }
    });
    
    console.log(`👨‍🏫 Instructores activos: ${instructors.length}\n`);
    
    let totalCreated = 0;
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayNumber = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`📅 Día ${dayNumber + 1}/30: ${currentDate.toLocaleDateString('es-ES')} (${dateStr})`);
      
      let dayCreated = 0;
      
      // Generar slots cada 30 minutos de 07:00 a 22:00 (último slot a las 22:00)
      for (let hour = 7; hour <= 22; hour++) {
        for (let minute of [0, 30]) {
          // No generar después de 22:00
          if (hour === 22 && minute === 30) continue;
          
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          
          // Para cada instructor, crear un TimeSlot
          for (const instructor of instructors) {
            const startDateTime = new Date(`${dateStr}T${time}:00.000Z`);
            const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);
            
            // Verificar si ya existe
            const existing = await prisma.timeSlot.findFirst({
              where: {
                clubId,
                instructorId: instructor.id,
                start: startDateTime,
                courtId: null
              }
            });
            
            if (existing) {
              continue; // Ya existe, saltar
            }
            
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
              
              dayCreated++;
              totalCreated++;
              
            } catch (error) {
              // Ignorar errores de duplicados
            }
          }
        }
      }
      
      console.log(`   ✅ ${dayCreated} slots creados\n`);
      
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`   Total creados: ${totalCreated} TimeSlots`);
    console.log(`   Días procesados: 30`);
    console.log(`   Horario: 07:00 - 22:00 (cada 30 min)`);
    console.log(`   Instructores: ${instructors.length}`);
    
    // Verificar total en BD
    const totalInDB = await prisma.timeSlot.count();
    console.log(`\n💾 Total TimeSlots en base de datos: ${totalInDB}`);
    
    // Calcular esperado
    const slotsPerDay = 31; // 07:00-22:00 = 31 slots (incluye 22:00)
    const expectedTotal = 30 * slotsPerDay * instructors.length;
    console.log(`   Esperado: ${expectedTotal} (30 días × ${slotsPerDay} slots × ${instructors.length} instructores)`);
    
    console.log('\n✅ GENERACIÓN COMPLETA');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateCompleteSchedule();
