require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('\n🔍 Buscando usuario Alex García...\n');
    
    const user = await prisma.user.findUnique({
      where: {
        email: 'alex@example.com'
      },
      select: {
        id: true,
        name: true,
        email: true,
        gender: true,
        level: true,
        credits: true
      }
    });

    if (user) {
      console.log('✅ Usuario encontrado:');
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log('❌ Usuario NO encontrado con email alex@example.com');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
