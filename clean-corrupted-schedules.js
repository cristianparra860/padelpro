import { prisma } from './src/lib/prisma.ts';

async function cleanCorruptedData() {
  try {
    console.log('🧹 LIMPIANDO DATOS CORRUPTOS\n');
    
    // 1. Limpiar InstructorSchedule (datos corruptos)
    const instructorScheduleCount = await prisma.instructorSchedule.count();
    console.log(`📊 InstructorSchedule actual: ${instructorScheduleCount} registros`);
    
    if (instructorScheduleCount > 0) {
      console.log('🗑️ Eliminando InstructorSchedule corrupto...');
      await prisma.instructorSchedule.deleteMany({});
      console.log('✅ InstructorSchedule limpiado');
    }
    
    // 2. Limpiar CourtSchedule también
    const courtScheduleCount = await prisma.courtSchedule.count();
    console.log(`\n📊 CourtSchedule actual: ${courtScheduleCount} registros`);
    
    if (courtScheduleCount > 0) {
      console.log('🗑️ Eliminando CourtSchedule...');
      await prisma.courtSchedule.deleteMany({});
      console.log('✅ CourtSchedule limpiado');
    }
    
    // 3. Verificar InstructorAvailability
    const availabilityCount = await prisma.instructorAvailability.count();
    console.log(`\n📊 InstructorAvailability: ${availabilityCount} registros`);
    
    if (availabilityCount === 0) {
      console.log('❌ NO HAY DISPONIBILIDAD CONFIGURADA');
      console.log('💡 Creando disponibilidad por defecto (Lunes-Domingo 07:00-22:00)...\n');
      
      const instructors = await prisma.$queryRawUnsafe(`
        SELECT id, name FROM Instructor WHERE isActive = 1
      `);
      
      // 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado
      const days = [1, 2, 3, 4, 5, 6, 0]; // Lunes a Domingo
      
      for (const instructor of instructors) {
        console.log(`   Configurando ${instructor.name}...`);
        for (const day of days) {
          await prisma.instructorAvailability.create({
            data: {
              instructorId: instructor.id,
              dayOfWeek: day,
              startTime: '07:00',
              endTime: '22:00'
            }
          });
        }
      }
      
      console.log('✅ Disponibilidad creada para todos los instructores');
    } else {
      console.log('✅ Disponibilidad ya configurada');
    }
    
    console.log('\n✅ LIMPIEZA COMPLETA');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanCorruptedData();
