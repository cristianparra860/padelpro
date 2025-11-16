const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recreateInstructors() {
  try {
    console.log('🔍 Buscando club...\n');
    
    // Encontrar el club
    const club = await prisma.club.findFirst();
    
    if (!club) {
      console.error('❌ No se encontró ningún club');
      return;
    }
    
    console.log(`✅ Club encontrado: ${club.name} (${club.id})\n`);
    
    // Crear usuarios y sus perfiles de instructor
    const instructorsData = [
      {
        instructorId: 'instructor-alex-garcia',
        userId: 'user-alex-garcia',
        name: 'Alex García',
        email: 'alex.garcia@padelpro.com',
        phone: '+34 600 111 001'
      },
      {
        instructorId: 'instructor-carlos-martinez',
        userId: 'user-carlos-martinez',
        name: 'Carlos Martínez',
        email: 'carlos.martinez@padelpro.com',
        phone: '+34 600 111 002'
      },
      {
        instructorId: 'instructor-cristian-parra',
        userId: 'user-cristian-parra',
        name: 'Cristian Parra',
        email: 'cristian.parra@padelpro.com',
        phone: '+34 600 111 003'
      }
    ];
    
    console.log('🌱 Creando instructores...\n');
    
    for (const data of instructorsData) {
      // Primero crear el usuario
      const user = await prisma.user.create({
        data: {
          id: data.userId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          clubId: club.id
        }
      });
      
      // Luego crear el perfil de instructor
      const instructor = await prisma.instructor.create({
        data: {
          id: data.instructorId,
          userId: user.id,
          name: data.name,
          clubId: club.id,
          isActive: true
        }
      });
      
      console.log(`✅ ${instructor.name} creado (usuario + instructor)`);
    }
    
    console.log('\n✅ Instructores recreados exitosamente!\n');
    
    // Verificar
    const count = await prisma.instructor.count();
    console.log(`📊 Total instructores: ${count}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recreateInstructors();
