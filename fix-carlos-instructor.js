const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCarlosInstructor() {
  try {
    console.log('🔍 Buscando usuario Carlos Rodriguez...');
    
    // Buscar a Carlos
    const carlos = await prisma.user.findFirst({
      where: {
        email: 'carlos@padelclub.com'
      }
    });
    
    if (!carlos) {
      console.log('❌ No se encontró a Carlos Rodriguez');
      return;
    }
    
    console.log('✅ Carlos encontrado:', { id: carlos.id, name: carlos.name, role: carlos.role });
    
    // Verificar si ya tiene registro de instructor
    const existingInstructor = await prisma.instructor.findUnique({
      where: { userId: carlos.id }
    });
    
    if (existingInstructor) {
      console.log('✅ Carlos ya tiene registro de instructor:', existingInstructor.id);
      return;
    }
    
    // Obtener el club
    const club = await prisma.club.findFirst({
      where: {
        name: 'Padel Estrella'
      }
    });
    
    if (!club) {
      console.log('❌ No se encontró el club');
      return;
    }
    
    console.log('🏢 Club encontrado:', { id: club.id, name: club.name });
    
    // Crear registro de instructor
    const instructor = await prisma.instructor.create({
      data: {
        name: carlos.name,
        userId: carlos.id,
        clubId: club.id,
        hourlyRate: 30,
        isAvailable: true,
        defaultRatePerHour: 30,
        rateTiers: JSON.stringify([
          { groupSize: 1, rate: 30 },
          { groupSize: 2, rate: 20 },
          { groupSize: 3, rate: 15 },
          { groupSize: 4, rate: 12 }
        ]),
        unavailableHours: JSON.stringify({}),
        levelRanges: JSON.stringify([
          { min: 0, max: 2.5, label: "Principiante" },
          { min: 2.5, max: 4.5, label: "Intermedio" },
          { min: 4.5, max: 7, label: "Avanzado" }
        ])
      }
    });
    
    console.log('✅ Registro de instructor creado:', {
      id: instructor.id,
      userId: instructor.userId,
      clubId: instructor.clubId,
      hourlyRate: instructor.hourlyRate
    });
    
    console.log('\n✅ Carlos ahora puede acceder al panel de instructor en /instructor');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCarlosInstructor();
