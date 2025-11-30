const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCristianInstructorLink() {
  try {
    // 1. Buscar el usuario
    const user = await prisma.user.findUnique({
      where: { email: 'cristian.parra@padelpro.com' }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Nombre:', user.name);

    // 2. Buscar el instructor vinculado
    const instructor = await prisma.instructor.findUnique({
      where: { userId: user.id }
    });

    if (instructor) {
      console.log('\n✅ Registro Instructor encontrado:');
      console.log('   ID Instructor:', instructor.id);
      console.log('   Nombre:', instructor.name);
      console.log('   User ID vinculado:', instructor.userId);
    } else {
      console.log('\n❌ NO hay registro en tabla Instructor para este usuario');
      console.log('\n🔧 Verificando si existe instructor con nombre similar...');
      
      const instructorByName = await prisma.instructor.findFirst({
        where: { 
          name: { contains: 'Cristian' }
        }
      });

      if (instructorByName) {
        console.log('\n⚠️ Encontrado instructor con nombre similar:');
        console.log('   ID:', instructorByName.id);
        console.log('   Nombre:', instructorByName.name);
        console.log('   User ID actual:', instructorByName.userId);
        
        console.log('\n🔧 ¿Necesitas vincular este instructor al usuario?');
        console.log(`   Ejecuta: UPDATE Instructor SET userId = '${user.id}' WHERE id = '${instructorByName.id}'`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCristianInstructorLink();
