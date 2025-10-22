const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addGenderToTimeSlot() {
  try {
    await prisma.$executeRaw`ALTER TABLE TimeSlot ADD COLUMN genderCategory TEXT`;
    console.log('✅ Columna genderCategory agregada a TimeSlot');
  } catch (error) {
    if (error.message.includes('duplicate column')) {
      console.log('⚠️  genderCategory ya existe en TimeSlot');
    } else {
      console.log('❌ Error:', error.message);
    }
  }

  // Actualizar todos los TimeSlots existentes para que sean 'mixto' por defecto
  await prisma.$executeRaw`
    UPDATE TimeSlot 
    SET genderCategory = 'mixto'
    WHERE genderCategory IS NULL
  `;
  console.log('✅ TimeSlots actualizados con categoría mixto');

  await prisma.$disconnect();
}

addGenderToTimeSlot();
