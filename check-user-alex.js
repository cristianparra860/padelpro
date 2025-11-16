const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        name: {
          contains: 'Alex'
        }
      }
    });

    console.log('📊 Usuario encontrado en BD:');
    console.log(JSON.stringify(user, null, 2));

    if (user) {
      console.log('\n💰 Saldo (credits):', user.credits);
      console.log('🎁 Puntos (points):', user.points);
      console.log('📸 Foto (profilePictureUrl):', user.profilePictureUrl);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
