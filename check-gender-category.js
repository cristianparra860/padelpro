const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGenderCategory() {
  console.log(' Verificando categoría de género de la clase confirmada...\n');
  
  const confirmed = await prisma.timeSlot.findFirst({
    where: { courtNumber: { not: null } },
    include: {
      bookings: {
        include: {
          user: true
        }
      }
    }
  });
  
  if (confirmed) {
    console.log(' Clase confirmada:');
    console.log(`   ID: ${confirmed.id}`);
    console.log(`   Pista: ${confirmed.courtNumber}`);
    console.log(`   Level: ${confirmed.level}`);
    console.log(`   Category: ${confirmed.category}`);
    console.log(`   GenderCategory: ${confirmed.genderCategory || 'NULL'}`);
    console.log(`\n Reservas:`);
    confirmed.bookings.forEach(b => {
      console.log(`   - ${b.user.name} (${b.user.gender || 'sin género'})`);
    });
  }
  
  await prisma.$disconnect();
}

checkGenderCategory();
