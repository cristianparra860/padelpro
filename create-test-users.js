const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log('👥 Creando usuarios de prueba...');

    const usersToCreate = [
      {
        id: 'user-maria-test',
        email: 'maria@padel.com',
        name: 'María González',
        level: 'intermedio'
      },
      {
        id: 'user-jose-test',
        email: 'jose@padel.com', 
        name: 'José Martínez',
        level: 'avanzado'
      },
      {
        id: 'user-ana-test',
        email: 'ana@padel.com',
        name: 'Ana López',
        level: 'principiante'
      }
    ];

    let created = 0;

    for (const userData of usersToCreate) {
      try {
        await prisma.user.create({
          data: userData
        });
        console.log(`✅ Usuario creado: ${userData.name} (${userData.email})`);
        created++;
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Usuario ya existe: ${userData.name}`);
        } else {
          console.error(`❌ Error creando ${userData.name}:`, error.message);
        }
      }
    }

    console.log(`\n🎉 Proceso completado: ${created} usuarios creados`);

    // Verificar todos los usuarios
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        level: true
      }
    });

    console.log(`\n📊 Total usuarios en la base de datos: ${allUsers.length}`);
    allUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - Nivel: ${user.level || 'No definido'}`);
    });

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();