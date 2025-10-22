const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAlex() {
  console.log('🔍 Buscando información de Alex García...\n');
  
  // Buscar usuario Alex García
  const alex = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { contains: 'Alex' } },
        { name: { contains: 'García' } },
        { email: { contains: 'alex' } }
      ]
    },
    include: {
      club: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
  
  if (alex) {
    console.log('✅ Usuario encontrado:');
    console.log('   ID:', alex.id);
    console.log('   Nombre:', alex.name);
    console.log('   Email:', alex.email);
    console.log('   Nivel:', alex.level);
    console.log('\n🏢 Club asociado:', alex.club);
  } else {
    console.log('❌ No se encontró Alex García en la base de datos');
    console.log('\n📋 Usuarios disponibles:');
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true }
    });
    allUsers.forEach(u => {
      console.log(`   - ${u.name} (${u.email})`);
    });
  }
  
  await prisma.$disconnect();
}

findAlex().catch(console.error);
