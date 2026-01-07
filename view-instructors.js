const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function viewInstructors() {
  try {
    const instructors = await prisma.instructor.findMany({
      include: {
        user: true
      }
    });

    console.log('\n📋 INSTRUCTORES EN LA BASE DE DATOS:\n');
    
    instructors.forEach(instructor => {
      console.log(`ID: ${instructor.id.substring(0, 15)}...`);
      console.log(`  Nombre en Instructor: "${instructor.name}"`);
      console.log(`  Nombre en User: "${instructor.user?.name || 'N/A'}"`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

viewInstructors();
