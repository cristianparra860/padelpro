const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAllMarcs() {
  const users = await prisma.user.findMany({
    where: {
      name: { contains: 'Marc' }
    }
  });

  console.log(`Usuarios con "Marc" en el nombre: ${users.length}\n`);
  users.forEach(u => {
    console.log(`${u.name} - ${u.email}`);
    console.log(`  ID: ${u.id}`);
    console.log(`  Nivel: ${u.level} | Género: ${u.gender}`);
    console.log('');
  });

  await prisma.$disconnect();
}

findAllMarcs();
