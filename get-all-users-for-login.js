const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getAllUsers() {
  try {
    // Obtener todos los usuarios con sus relaciones
    const users = await prisma.user.findMany({
      include: {
        club: {
          select: {
            name: true
          }
        },
        instructorProfile: {
          select: {
            id: true,
            specialties: true
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });

    // Obtener admins
    const admins = await prisma.admin.findMany({
      include: {
        clubs: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('=== USUARIOS ORGANIZADOS POR ROL ===\n');

    // Super Admins
    const superAdmins = admins.filter(a => a.role === 'SUPER_ADMIN');
    console.log('🟣 SUPER ADMINISTRADOR:');
    superAdmins.forEach(admin => {
      console.log(`- ${admin.name}`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Password: Pass123!`);
    });
    console.log('');

    // Club Admins
    const clubAdmins = admins.filter(a => a.role === 'CLUB_ADMIN');
    console.log('🔴 ADMINISTRADORES DE CLUB:');
    clubAdmins.forEach(admin => {
      console.log(`- ${admin.name}`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Club: ${admin.clubs.map(c => c.name).join(', ') || 'Sin club'}`);
      console.log(`  Password: Pass123!`);
    });
    console.log('');

    // Instructores
    const instructors = users.filter(u => u.role === 'INSTRUCTOR');
    console.log('🟡 INSTRUCTORES:');
    instructors.forEach(user => {
      console.log(`- ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Club: ${user.club?.name || 'Sin club'}`);
      console.log(`  Especialidad: ${user.instructorProfile?.specialties || 'Sin especialidad'}`);
      console.log(`  Password: Pass123!`);
    });
    console.log('');

    // Jugadores
    const players = users.filter(u => u.role === 'PLAYER');
    console.log('🟢 JUGADORES:');
    players.forEach(user => {
      console.log(`- ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Club: ${user.club?.name || 'Sin club'}`);
      console.log(`  Nivel: ${user.level}`);
      console.log(`  Password: Pass123!`);
    });
    console.log('');

    // Generar código JSON para copiar
    console.log('\n=== DATOS PARA COPIAR EN page.tsx ===\n');
    
    const loginData = {
      superAdmins: superAdmins.map(a => ({
        name: a.name,
        email: a.email,
        password: 'Pass123!'
      })),
      clubAdmins: clubAdmins.map(a => ({
        name: a.name,
        email: a.email,
        password: 'Pass123!',
        club: a.clubs[0]?.name || 'Sin club'
      })),
      instructors: instructors.map(u => ({
        name: u.name,
        email: u.email,
        password: 'Pass123!',
        club: u.club?.name || 'Sin club'
      })),
      players: players.map(u => ({
        name: u.name,
        email: u.email,
        password: 'Pass123!',
        club: u.club?.name || 'Sin club'
      }))
    };

    console.log(JSON.stringify(loginData, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getAllUsers();
