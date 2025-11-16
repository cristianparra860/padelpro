const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateUserGender() {
  try {
    // Actualizar todos los usuarios sin género definido
    const usersToUpdate = [
      'alex-user-id',
      'cmhkwi8so0001tggo0bwojrjy'
    ];

    for (const userId of usersToUpdate) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, gender: true }
      });

      if (user && !user.gender) {
        await prisma.user.update({
          where: { id: userId },
          data: { gender: 'masculino' }
        });
        console.log(`✅ Género actualizado a "masculino" para ${user.name} (${userId})`);
      } else if (user) {
        console.log(`ℹ️  ${user.name} ya tiene género: ${user.gender}`);
      }
    }
    
    console.log('\n✅ Todos los usuarios actualizados');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserGender();
