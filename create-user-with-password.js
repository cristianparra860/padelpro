// create-user-with-password.js
// Script para crear usuarios con contraseña y rol específico

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createUser(userData) {
  try {
    console.log('\n🔨 Creando usuario...');
    console.log('   Email:', userData.email);
    console.log('   Role:', userData.role);

    // Verificar si ya existe
    const existing = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existing) {
      console.log('❌ El email ya está registrado');
      return;
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Generar ID único
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        id: userId,
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        clubId: userData.clubId || 'padel-estrella-madrid',
        role: userData.role,
        level: userData.level || 'intermedio',
        genderCategory: userData.genderCategory || null,
        credits: userData.credits || 0,
        blockedCredits: 0,
        points: userData.points || 0,
        preference: 'NORMAL',
        visibility: 'PUBLIC'
      }
    });

    console.log('✅ Usuario creado exitosamente:');
    console.log('   ID:', user.id);
    console.log('   Nombre:', user.name);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Password:', userData.password, '(recuerda cambiarla)');

  } catch (error) {
    console.error('💥 Error creando usuario:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Obtener argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('\n📘 Uso:');
  console.log('   node create-user-with-password.js <email> <password> <name> [role] [level]\n');
  console.log('Ejemplos:');
  console.log('   node create-user-with-password.js admin@club.com Admin123! "Admin Club" CLUB_ADMIN avanzado');
  console.log('   node create-user-with-password.js player@test.com Player123! "Test Player"');
  console.log('   node create-user-with-password.js instructor@club.com Teach123! "Carlos Instructor" INSTRUCTOR avanzado\n');
  console.log('Roles disponibles: PLAYER, INSTRUCTOR, CLUB_ADMIN, SUPER_ADMIN');
  console.log('Niveles: principiante, intermedio, avanzado\n');
  process.exit(0);
}

const [email, password, name, role = 'PLAYER', level = 'intermedio'] = args;

if (!email || !password || !name) {
  console.error('❌ Email, password y nombre son requeridos');
  process.exit(1);
}

const validRoles = ['PLAYER', 'INSTRUCTOR', 'CLUB_ADMIN', 'SUPER_ADMIN'];
if (!validRoles.includes(role)) {
  console.error('❌ Role inválido. Use:', validRoles.join(', '));
  process.exit(1);
}

const userData = {
  email,
  password,
  name,
  role,
  level,
  credits: role === 'CLUB_ADMIN' ? 1000 : 50, // Admins empiezan con más créditos
  points: 0
};

createUser(userData);
