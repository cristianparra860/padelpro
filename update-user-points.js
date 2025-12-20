// update-user-points.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateUserPoints() {
  try {
    console.log('🔧 Actualizando puntos de usuarios...');
    
    // Obtener todos los usuarios PLAYER con menos de 100 puntos
    const users = await prisma.user.findMany({
      where: {
        points: { lt: 100 },
        role: 'PLAYER'
      }
    });
    
    console.log(`📊 Encontrados ${users.length} usuarios con menos de 100 puntos`);
    
    for (const user of users) {
      const newPoints = user.points + 100;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { points: newPoints }
      });
      
      console.log(`✅ ${user.email}: ${user.points} → ${newPoints} puntos`);
    }
    
    console.log('✨ Actualización completada!');
    await prisma.$disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updateUserPoints();
