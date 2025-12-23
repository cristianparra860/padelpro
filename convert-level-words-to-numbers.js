// convert-level-words-to-numbers.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function convertLevels() {
  try {
    console.log('\n🔄 Convirtiendo niveles de palabras a números...\n');

    // Buscar usuarios con niveles en palabras
    const usersWithWordLevels = await prisma.user.findMany({
      where: {
        OR: [
          { level: { contains: 'principiante' } },
          { level: { contains: 'intermedio' } },
          { level: { contains: 'avanzado' } },
          { level: { contains: 'Principiante' } },
          { level: { contains: 'Intermedio' } },
          { level: { contains: 'Avanzado' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        level: true
      }
    });

    console.log(`📋 Usuarios con niveles en palabras: ${usersWithWordLevels.length}\n`);

    if (usersWithWordLevels.length === 0) {
      console.log('✅ No hay usuarios con niveles en palabras');
      return;
    }

    // Mapeo de palabras a números
    const levelMapping = {
      'principiante': '2.0',
      'Principiante': '2.0',
      'intermedio': '4.0',
      'Intermedio': '4.0',
      'avanzado': '6.0',
      'Avanzado': '6.0'
    };

    let converted = 0;

    for (const user of usersWithWordLevels) {
      const currentLevel = user.level.toLowerCase();
      let newLevel = '2.0'; // Por defecto

      // Buscar coincidencia
      if (currentLevel.includes('principiante')) {
        newLevel = '2.0';
      } else if (currentLevel.includes('intermedio')) {
        newLevel = '4.0';
      } else if (currentLevel.includes('avanzado')) {
        newLevel = '6.0';
      }

      console.log(`📝 ${user.name} (${user.email})`);
      console.log(`   Nivel actual: ${user.level}`);
      console.log(`   Nuevo nivel: ${newLevel}`);

      await prisma.user.update({
        where: { id: user.id },
        data: { level: newLevel }
      });

      converted++;
      console.log('');
    }

    console.log(`\n✅ Convertidos ${converted} usuarios exitosamente`);

    // Verificar resultado
    const verifyUsers = await prisma.user.findMany({
      where: {
        id: { in: usersWithWordLevels.map(u => u.id) }
      },
      select: {
        name: true,
        level: true
      }
    });

    console.log('\n📊 Verificación:');
    verifyUsers.forEach(u => {
      console.log(`   ${u.name}: ${u.level}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

convertLevels();
