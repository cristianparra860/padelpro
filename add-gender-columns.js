const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addGenderColumns() {
  try {
    // Agregar columna genderCategory
    await prisma.$executeRaw`ALTER TABLE User ADD COLUMN genderCategory TEXT`;
    console.log('✅ Columna genderCategory agregada');
  } catch (error) {
    if (error.message.includes('duplicate column')) {
      console.log('⚠️  genderCategory ya existe');
    } else {
      console.log('❌ Error genderCategory:', error.message);
    }
  }

  try {
    // Agregar columna preferredGameType
    await prisma.$executeRaw`ALTER TABLE User ADD COLUMN preferredGameType TEXT`;
    console.log('✅ Columna preferredGameType agregada');
  } catch (error) {
    if (error.message.includes('duplicate column')) {
      console.log('⚠️  preferredGameType ya existe');
    } else {
      console.log('❌ Error preferredGameType:', error.message);
    }
  }

  // Actualizar el usuario Alex con valores por defecto
  await prisma.$executeRaw`
    UPDATE User 
    SET genderCategory = 'masculino', 
        preferredGameType = 'clases'
    WHERE id = 'alex-user-id'
  `;
  console.log('✅ Usuario Alex actualizado con categoría masculino y preferencia clases');

  await prisma.$disconnect();
}

addGenderColumns();
