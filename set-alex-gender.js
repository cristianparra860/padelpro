const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setAlexGender() {
  const updated = await prisma.user.update({
    where: { id: 'alex-user-id' },
    data: { gender: 'masculino' }
  });
  
  console.log(' Alex García actualizado:');
  console.log('   Género:', updated.gender);
  
  // Actualizar las clases existentes
  const classes = await prisma.timeSlot.updateMany({
    where: { courtNumber: { not: null } },
    data: { genderCategory: 'masculino' }
  });
  
  console.log(` ${classes.count} clases actualizadas a categoría: masculino`);
  
  await prisma.$disconnect();
}

setAlexGender();
