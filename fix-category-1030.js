const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCategory() {
  await prisma.$executeRaw`
    UPDATE TimeSlot 
    SET genderCategory = 'masculino' 
    WHERE id = 'cmhkwtlua002vtg7gmx4t1tet'
  `;
  
  console.log('✅ Categoría "masculino" establecida para clase 10:30');
  
  const slot = await prisma.timeSlot.findUnique({
    where: { id: 'cmhkwtlua002vtg7gmx4t1tet' },
    select: { courtNumber: true, genderCategory: true }
  });
  
  console.log(`\nEstado final:`);
  console.log(`   Pista: ${slot.courtNumber}`);
  console.log(`   Categoría: ${slot.genderCategory}`);
  
  await prisma.$disconnect();
}

fixCategory().catch(console.error);
