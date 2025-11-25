const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findFirst({
    where: { email: 'cristian.parra@padelpro.com' }
  });
  
  console.log('Usuario:', user ? user.name : 'No encontrado');
  console.log('Email:', user?.email);
  console.log('ID:', user?.id);
  console.log('Foto actual:', user?.profilePictureUrl?.substring(0, 80));
  
  await prisma.$disconnect();
}

test();
