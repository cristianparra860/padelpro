const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedLoginUsers() {
  try {
    console.log('\n🔐 === CREANDO USUARIOS DE LOGIN ===\n');
    
    const password = await bcrypt.hash('Pass123!', 10);
    
    // Obtener o crear el club
    let club = await prisma.club.findFirst();
    if (!club) {
      console.log('🏢 Creando club de prueba...');
      club = await prisma.club.create({
        data: {
          name: 'Padel Estrella Madrid',
          slug: 'padel-estrella-madrid',
          address: 'Calle Test 123, Madrid',
          phone: '123456789',
          email: 'info@padelestrella.com'
        }
      });
    }
    console.log(`📍 Usando club: ${club.name} (${club.id})\n`);
    
    // Super Admin
    console.log('🟣 Creando Super Admin...');
    await prisma.user.upsert({
      where: { email: 'superadmin@padelapp.com' },
      update: {},
      create: {
        email: 'superadmin@padelapp.com',
        password,
        name: 'Super Administrador',
        role: 'SUPER_ADMIN',
        level: '5.0',
        gender: 'masculino',
        credits: 100000,
        points: 50000,
        clubId: club.id
      }
    });
    
    // Club Admin
    console.log('🔴 Creando Club Admin...');
    await prisma.user.upsert({
      where: { email: 'club.admin@padelpro.com' },
      update: {},
      create: {
        email: 'club.admin@padelpro.com',
        password,
        name: 'Admin Padel Estrella Madrid',
        role: 'CLUB_ADMIN',
        level: '4.0',
        gender: 'masculino',
        credits: 50000,
        points: 25000,
        clubId: club.id
      }
    });
    
    // Instructores
    const instructors = [
      { email: 'instructor@gmail.com', name: 'Pedro López', level: '6.0' },
      { email: 'david.collado@padelpro.com', name: 'Ana González', level: '5.5' },
      { email: 'carlos@padelclub.com', name: 'Carlos Rodriguez', level: '6.5' },
      { email: 'alex.garcia@padelpro.com', name: 'Diego Martinez', level: '5.0' },
      { email: 'cristian.parra@padelpro.com', name: 'Instructor 5', level: '5.5' },
      { email: 'instructor@padelpro.com', name: 'Instructor 6', level: '6.0' },
      { email: 'ana@padelclub.com', name: 'Maria Fernández', level: '5.0' }
    ];
    
    console.log('🟡 Creando Instructores...');
    for (const inst of instructors) {
      await prisma.user.upsert({
        where: { email: inst.email },
        update: {},
        create: {
          email: inst.email,
          password,
          name: inst.name,
          role: 'INSTRUCTOR',
          level: inst.level,
          gender: Math.random() > 0.5 ? 'masculino' : 'femenino',
          credits: 30000,
          points: 15000,
          clubId: club.id
        }
      });
      console.log(`  ✅ ${inst.name}`);
    }
    
    // Jugadores
    const players = [
      { email: 'alex@example.com', name: 'Alex García', level: '3.0' },
      { email: 'jugador1@gmail.com', name: 'Carlos Rodríguez', level: '2.5' },
      { email: 'jugador3@gmail.com', name: 'Juan Martínez', level: '4.0' },
      { email: 'jugador2@gmail.com', name: 'María González', level: '3.5' }
    ];
    
    console.log('🟢 Creando Jugadores...');
    for (const player of players) {
      await prisma.user.upsert({
        where: { email: player.email },
        update: {},
        create: {
          email: player.email,
          password,
          name: player.name,
          role: 'PLAYER',
          level: player.level,
          gender: player.name.includes('María') ? 'femenino' : 'masculino',
          credits: 10000,
          points: 5000,
          clubId: club.id
        }
      });
      console.log(`  ✅ ${player.name}`);
    }
    
    console.log('\n✅ === USUARIOS CREADOS EXITOSAMENTE ===\n');
    console.log('Puedes hacer login con:');
    console.log('  Email: [cualquier email de arriba]');
    console.log('  Password: Pass123!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedLoginUsers();
