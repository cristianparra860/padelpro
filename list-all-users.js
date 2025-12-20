const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllUsers() {
  try {
    console.log('=== LISTING ALL USERS ===\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        credits: true,
        points: true
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });
    
    console.log(`Total users: ${users.length}\n`);
    
    // Agrupar por rol
    const byRole = {
      SUPER_ADMIN: [],
      CLUB_ADMIN: [],
      INSTRUCTOR: [],
      PLAYER: []
    };
    
    users.forEach(user => {
      if (byRole[user.role]) {
        byRole[user.role].push(user);
      }
    });
    
    // Mostrar por rol
    console.log('📊 USUARIOS POR ROL:\n');
    
    if (byRole.SUPER_ADMIN.length > 0) {
      console.log('🔴 SUPER ADMINS:');
      byRole.SUPER_ADMIN.forEach(u => {
        console.log(`   - ${u.name} (${u.email})`);
      });
      console.log('');
    }
    
    if (byRole.CLUB_ADMIN.length > 0) {
      console.log('🟠 CLUB ADMINS:');
      byRole.CLUB_ADMIN.forEach(u => {
        console.log(`   - ${u.name} (${u.email})`);
      });
      console.log('');
    }
    
    if (byRole.INSTRUCTOR.length > 0) {
      console.log('🟡 INSTRUCTORS:');
      byRole.INSTRUCTOR.forEach(u => {
        console.log(`   - ${u.name} (${u.email})`);
      });
      console.log('');
    }
    
    if (byRole.PLAYER.length > 0) {
      console.log('🟢 PLAYERS:');
      byRole.PLAYER.forEach(u => {
        console.log(`   - ${u.name} (${u.email}) - ${u.credits}€, ${u.points} pts`);
      });
      console.log('');
    }
    
    // Generar JSON para el componente
    console.log('\n=== JSON FOR COMPONENT ===\n');
    console.log(JSON.stringify(users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role
    })), null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllUsers();
