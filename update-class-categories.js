const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateExistingClasses() {
  console.log(' Actualizando categoría de clases existentes...\n');
  
  // Obtener el género de Alex
  const alex = await prisma.user.findUnique({
    where: { id: 'alex-user-id' },
    select: { gender: true, name: true }
  });
  
  if (alex) {
    console.log(` Alex García - Género: ${alex.gender || 'no definido'}`);
    
    const classCategory = alex.gender === 'masculino' ? 'masculino' : 
                         alex.gender === 'femenino' ? 'femenino' : 
                         'mixto';
    
    console.log(`    Categoría de clase: ${classCategory}\n`);
    
    // Actualizar todas las clases confirmadas donde Alex es el único reservante
    const updated = await prisma.timeSlot.updateMany({
      where: {
        courtNumber: { not: null }
      },
      data: {
        genderCategory: classCategory
      }
    });
    
    console.log(` ${updated.count} clases actualizadas a categoría: ${classCategory}`);
  }
  
  await prisma.$disconnect();
}

updateExistingClasses();
