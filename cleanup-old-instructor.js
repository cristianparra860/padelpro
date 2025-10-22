const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupOldInstructor() {
  console.log('\n🧹 Limpiando instructor antiguo...\n');

  try {
    // Eliminar el instructor antiguo que usa el mismo usuario que Alex
    await prisma.$executeRaw`
      DELETE FROM Instructor WHERE id = 'instructor-1'
    `;
    console.log('✅ Instructor antiguo eliminado');

    // Verificar que solo queda Carlos
    const instructors = await prisma.$queryRaw`
      SELECT i.id, u.name, u.email, i.hourlyRate, i.isActive
      FROM Instructor i
      JOIN User u ON u.id = i.userId
    `;

    console.log('\n👨‍🏫 Instructores activos:\n');
    instructors.forEach(inst => {
      console.log(`   ✅ ${inst.name}`);
      console.log(`      Email: ${inst.email}`);
      console.log(`      ID: ${inst.id}`);
      console.log(`      Tarifa: €${inst.hourlyRate}/hora`);
      console.log('');
    });

    console.log('✅ Sistema limpio y organizado!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOldInstructor();
