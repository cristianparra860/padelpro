const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function renameCarlos() {
  try {
    console.log('🔄 Renombrando Carlos Martínez a David Collado...\n');

    // Actualizar el instructor
    const updated = await prisma.instructor.update({
      where: { id: 'instructor-carlos-martinez' },
      data: { name: 'David Collado' }
    });

    console.log('✅ Instructor actualizado:');
    console.log(`   ID: ${updated.id}`);
    console.log(`   Nombre nuevo: ${updated.name}`);

    // Actualizar también el usuario asociado
    const user = await prisma.user.update({
      where: { id: 'user-carlos-martinez' },
      data: { 
        name: 'David Collado',
        email: 'david.collado@padelpro.com'
      }
    });

    console.log('\n✅ Usuario actualizado:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Nombre: ${user.name}`);
    console.log(`   Email: ${user.email}`);

    console.log('\n🎉 Cambio completado! Ahora el calendario mostrará:');
    console.log('   - Carlos Martinez');
    console.log('   - David Collado');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

renameCarlos();
