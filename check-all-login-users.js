const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllUsers() {
  try {
    console.log('\n=== USUARIOS PARA LOGIN ===\n');

    // Super Admin
    console.log('🔴 SUPER ADMIN:');
    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true, name: true, email: true, password: true, role: true }
    });
    superAdmins.forEach(u => {
      console.log(`- ${u.name}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Has password: ${u.password ? 'YES' : 'NO'}`);
      console.log();
    });

    // Club Admins
    console.log('🟠 CLUB ADMINS:');
    const clubAdmins = await prisma.user.findMany({
      where: { role: 'CLUB_ADMIN' },
      select: { id: true, name: true, email: true, password: true, role: true }
    });
    clubAdmins.forEach(u => {
      console.log(`- ${u.name}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Has password: ${u.password ? 'YES' : 'NO'}`);
      console.log();
    });

    // Instructores
    console.log('🟡 INSTRUCTORES:');
    const instructors = await prisma.user.findMany({
      where: { role: 'INSTRUCTOR' },
      select: { id: true, name: true, email: true, password: true, role: true }
    });
    instructors.forEach(u => {
      console.log(`- ${u.name}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Has password: ${u.password ? 'YES' : 'NO'}`);
      console.log();
    });

    // Jugadores de ejemplo
    console.log('🟢 JUGADORES (sample):');
    const players = await prisma.user.findMany({
      where: { role: 'PLAYER' },
      take: 6,
      select: { id: true, name: true, email: true, password: true, role: true }
    });
    players.forEach(u => {
      console.log(`- ${u.name}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Has password: ${u.password ? 'YES' : 'NO'}`);
      console.log();
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllUsers();
