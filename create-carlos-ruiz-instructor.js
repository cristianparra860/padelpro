const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createCarlosRuizInstructor() {
  try {
    console.log('🔍 Buscando usuario Carlos Ruiz...');
    
    // Buscar el usuario Carlos Ruiz
    const carlosUser = await prisma.user.findFirst({
      where: { email: 'instructor@padelpro.com' }
    });
    
    if (!carlosUser) {
      console.log('❌ No se encontró el usuario con email instructor@padelpro.com');
      return;
    }
    
    console.log('✅ Usuario encontrado:', {
      id: carlosUser.id,
      name: carlosUser.name,
      email: carlosUser.email,
      role: carlosUser.role
    });
    
    // Verificar si ya existe en la tabla Instructor
    const existingInstructor = await prisma.instructor.findFirst({
      where: { userId: carlosUser.id }
    });
    
    if (existingInstructor) {
      console.log('⚠️ Ya existe un registro de instructor para este usuario:', existingInstructor);
      return;
    }
    
    // Crear el registro de instructor
    const instructor = await prisma.instructor.create({
      data: {
        id: 'instructor-carlos-ruiz',
        userId: carlosUser.id,
        name: 'Carlos Ruiz',
        specialties: 'Clases generales de pádel',
        experience: '5 años de experiencia',
        hourlyRate: 30,
        clubId: 'padel-estrella-madrid',
        isActive: true
      }
    });
    
    console.log('✅ Instructor creado exitosamente:', {
      id: instructor.id,
      name: instructor.name,
      userId: instructor.userId,
      clubId: instructor.clubId,
      hourlyRate: instructor.hourlyRate
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createCarlosRuizInstructor();
