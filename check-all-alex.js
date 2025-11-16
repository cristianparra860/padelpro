const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAlexUsers() {
  try {
    const alexUsers = await prisma.user.findMany({
      where: {
        name: {
          contains: 'Alex'
        }
      }
    });

    console.log(`📊 Encontrados ${alexUsers.length} usuarios con "Alex" en el nombre:\n`);

    alexUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. Usuario:`);
      console.log('   ID:', user.id);
      console.log('   Nombre:', user.name);
      console.log('   Email:', user.email);
      console.log('   Créditos:', user.credits, '(€' + (user.credits / 100).toFixed(2) + ')');
      console.log('   Puntos:', user.points);
      console.log('   Foto:', user.profilePictureUrl?.substring(0, 80) + '...');
      console.log('   Creado:', user.createdAt);
    });

    // Buscar reservas de cada Alex
    console.log('\n\n📋 Verificando reservas...\n');
    for (const user of alexUsers) {
      const bookings = await prisma.booking.findMany({
        where: { userId: user.id },
        take: 3
      });
      console.log(`\n${user.name} (${user.id.substring(0, 8)}...): ${bookings.length} reservas`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAlexUsers();
