const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminUsers() {
  try {
    console.log('🔍 Buscando usuarios administradores...\n');

    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' }
    });

    const clubAdmins = await prisma.user.findMany({
      where: { role: 'CLUB_ADMIN' }
    });

    console.log('🟣 SUPER ADMINISTRADORES:');
    if (superAdmins.length === 0) {
      console.log('  ❌ No hay super administradores\n');
    } else {
      superAdmins.forEach(user => {
        console.log(`  ✅ ${user.name}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     ID: ${user.id}\n`);
      });
    }

    console.log('🔴 ADMINISTRADORES DE CLUB:');
    if (clubAdmins.length === 0) {
      console.log('  ❌ No hay administradores de club\n');
    } else {
      clubAdmins.forEach(user => {
        console.log(`  ✅ ${user.name}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     ID: ${user.id}\n`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUsers();
