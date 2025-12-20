const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setAnaGender() {
  try {
    console.log('🔧 Actualizando género de Ana...\n');
    
    // Actualizar género de Ana a femenino
    await prisma.user.update({
      where: { id: 'ana-user-1764950840275' },
      data: {
        gender: 'femenino',
        genderCategory: 'femenino'
      }
    });
    
    console.log('✅ Género actualizado correctamente\n');
    
    // Verificar
    const ana = await prisma.user.findUnique({
      where: { id: 'ana-user-1764950840275' },
      select: {
        name: true,
        gender: true,
        genderCategory: true
      }
    });
    
    console.log('👤 Usuario Ana:');
    console.log('   Nombre:', ana?.name);
    console.log('   Gender:', ana?.gender);
    console.log('   GenderCategory:', ana?.genderCategory);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setAnaGender();
