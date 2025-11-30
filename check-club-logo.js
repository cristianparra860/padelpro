const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const club = await prisma.club.findFirst({
    where: { name: { contains: 'Padel Estrella' } }
  });
  
  console.log('\nClub:', club?.name);
  console.log('Logo:', club?.logo ? 'SI TIENE LOGO' : 'NO TIENE LOGO');
  
  if (club?.logo) {
    console.log('Logo (primeros 100 chars):', club.logo.substring(0, 100));
  }
  
  await prisma.$disconnect();
}

main();
