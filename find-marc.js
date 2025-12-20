const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findMarc() {
  const users = await prisma.user.findMany({
    where: {
      name: { contains: 'Marc' }
    },
    select: { id: true, email: true, name: true }
  });
  
  console.log('Usuarios Marc encontrados:', users.length);
  users.forEach(u => {
    console.log('  -', u.name, '|', u.email);
  });
  
  await prisma.$disconnect();
}

findMarc();
