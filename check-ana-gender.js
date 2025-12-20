const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAnaGender() {
  try {
    const ana = await prisma.user.findUnique({
      where: { id: 'ana-user-1764950840275' },
      select: {
        id: true,
        name: true,
        email: true,
        gender: true,
        genderCategory: true,
        level: true
      }
    });
    
    if (ana) {
      console.log('👤 Usuario Ana:');
      console.log('   Nombre:', ana.name);
      console.log('   Email:', ana.email);
      console.log('   Gender:', ana.gender || 'NULL');
      console.log('   GenderCategory:', ana.genderCategory || 'NULL');
      console.log('   Level:', ana.level);
    } else {
      console.log('❌ Ana no encontrada');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAnaGender();
