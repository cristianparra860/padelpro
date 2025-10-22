const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCategory() {
  await prisma.$executeRaw`
    UPDATE TimeSlot 
    SET genderCategory = 'masculino' 
    WHERE id = 'cmgv5grpn000etgnod5flkuk2'
  `;
  
  console.log('✅ Clase 09:00 actualizada a masculino');
  await prisma.$disconnect();
}

fixCategory();
