const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTimeSlotTable() {
  console.log('\n🔧 Agregando columnas a TimeSlot...\n');

  try {
    // Agregar courtNumber
    try {
      await prisma.$executeRaw`ALTER TABLE TimeSlot ADD COLUMN courtNumber INTEGER`;
      console.log('✅ courtNumber agregada');
    } catch (e) {
      if (e.message.includes('duplicate column')) {
        console.log('⏭️  courtNumber ya existe');
      } else throw e;
    }

    // Agregar genderCategory
    try {
      await prisma.$executeRaw`ALTER TABLE TimeSlot ADD COLUMN genderCategory TEXT`;
      console.log('✅ genderCategory agregada');
    } catch (e) {
      if (e.message.includes('duplicate column')) {
        console.log('⏭️  genderCategory ya existe');
      } else throw e;
    }

    console.log('\n✅ TimeSlot actualizada correctamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixTimeSlotTable();
