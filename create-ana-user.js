const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createUser() {
  try {
    const hash = await bcrypt.hash('password123', 10);
    
    const user = await prisma.user.create({
      data: {
        id: 'ana-user-' + Date.now(),
        email: 'ana.nueva@padelpro.com',
        password: hash,
        name: 'Ana Nueva',
        role: 'PLAYER',
        credits: 10000,
        points: 100,
        level: 'intermedio',
        clubId: 'padel-estrella-madrid'
      }
    });
    
    console.log('\n✅ USUARIO CREADO EXITOSAMENTE:\n');
    console.log('📧 Email: ana.nueva@padelpro.com');
    console.log('🔑 Password: password123');
    console.log('👤 Nombre:', user.name);
    console.log('💰 Créditos:', user.credits / 100, '€');
    console.log('⭐ Puntos:', user.points);
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
