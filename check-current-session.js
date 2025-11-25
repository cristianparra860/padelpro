const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCurrentSession() {
  try {
    console.log('🔍 VERIFICANDO SESIÓN ACTUAL\n');
    console.log('='.repeat(70));
    
    // Verificar todos los usuarios que tienen foto
    console.log('\n1️⃣ USUARIOS CON FOTO EN LA BASE DE DATOS:\n');
    const usersWithPhoto = await prisma.user.findMany({
      where: {
        profilePictureUrl: { not: null }
      },
      select: {
        id: true,
        name: true,
        email: true,
        profilePictureUrl: true
      }
    });
    
    usersWithPhoto.forEach(u => {
      const isBase64 = u.profilePictureUrl?.startsWith('data:image');
      console.log(`👤 ${u.name} (${u.email})`);
      console.log(`   ID: ${u.id}`);
      console.log(`   Foto base64: ${isBase64 ? '✅ SÍ' : '❌ NO'}`);
      console.log(`   Tamaño: ${Math.round((u.profilePictureUrl?.length || 0) / 1024)} KB`);
      console.log('');
    });
    
    // Buscar usuario "JP" (Juan Pérez o similar)
    console.log('2️⃣ BUSCANDO USUARIO CON INICIALES "JP":\n');
    const jpUsers = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: 'Juan' } },
          { name: { contains: 'Pérez' } },
          { name: { contains: 'JP' } }
        ]
      }
    });
    
    if (jpUsers.length > 0) {
      jpUsers.forEach(u => {
        console.log(`✅ Encontrado: ${u.name} (${u.email})`);
        console.log(`   ID: ${u.id}`);
        console.log(`   Tiene foto: ${!!u.profilePictureUrl}`);
        if (u.profilePictureUrl) {
          console.log(`   Es base64: ${u.profilePictureUrl.startsWith('data:image') ? 'SÍ' : 'NO'}`);
        }
        console.log('');
      });
    } else {
      console.log('❌ No se encontró ningún usuario con esas iniciales');
    }
    
    // Intentar login con diferentes usuarios comunes
    console.log('3️⃣ PROBANDO LOGINS COMUNES:\n');
    const testAccounts = [
      { email: 'jugador1@padelpro.com', password: 'password123', name: 'Juan Pérez' },
      { email: 'cristian.parra@padelpro.com', password: 'password123', name: 'Cristian Parra' },
      { email: 'admin@padelpro.com', password: 'password123', name: 'Admin' }
    ];
    
    for (const account of testAccounts) {
      try {
        const res = await fetch('http://localhost:9002/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: account.email, password: account.password })
        });
        
        if (res.ok) {
          const data = await res.json();
          console.log(`✅ Login exitoso: ${account.name}`);
          console.log(`   Email: ${account.email}`);
          console.log(`   Tiene foto: ${!!data.user?.profilePictureUrl}`);
          
          if (data.user?.profilePictureUrl) {
            const isBase64 = data.user.profilePictureUrl.startsWith('data:image');
            console.log(`   Es base64: ${isBase64 ? 'SÍ' : 'NO'}`);
            console.log(`   Primeros 60: ${data.user.profilePictureUrl.substring(0, 60)}`);
          }
          console.log('');
        }
      } catch (e) {
        // Silenciar errores
      }
    }
    
    console.log('='.repeat(70));
    console.log('\n💡 RECOMENDACIÓN:\n');
    console.log('Si estás usando un usuario sin foto en base64, necesitas:');
    console.log('1. Hacer logout');
    console.log('2. Login con: cristian.parra@padelpro.com / password123');
    console.log('3. Ese usuario YA tiene una foto de prueba guardada\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentSession();
