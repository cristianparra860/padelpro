const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findUnique({
    where: { id: 'cmhkwi8so0001tggo0bwojrjy' },
    select: { name: true, credits: true, points: true }
  });
  
  console.log('Usuario antes de cancelar:', user);
  await prisma.$disconnect();
}

checkUser();
