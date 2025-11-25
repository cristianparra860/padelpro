// Simular exactamente el flujo del navegador para encontrar el problema
const fetch = require('node-fetch');

async function simulateBrowserFlow() {
  try {
    console.log('\n🌐 SIMULACIÓN DEL FLUJO DEL NAVEGADOR\n');
    console.log('='.repeat(70));
    
    // 1. Login
    console.log('\n1️⃣ LOGIN CON JUAN PÉREZ...');
    const loginRes = await fetch('http://localhost:9002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jugador1@padelpro.com',
        password: 'Pass123!'
      })
    });
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    const cookies = loginRes.headers.get('set-cookie');
    
    console.log('✅ Login exitoso');
    console.log('   User ID del login:', loginData.user.id);
    console.log('   User Name:', loginData.user.name);
    console.log('   Token guardado:', token ? 'Sí' : 'No');
    
    // 2. Verificar /api/users/current (lo que hace el dashboard)
    console.log('\n2️⃣ VERIFICANDO /api/users/current (como el dashboard)...');
    const currentUserRes = await fetch('http://localhost:9002/api/users/current', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': cookies || ''
      }
    });
    
    const currentUser = await currentUserRes.json();
    console.log('✅ Usuario obtenido desde /api/users/current:');
    console.log('   ID:', currentUser.id);
    console.log('   Name:', currentUser.name);
    console.log('   Email:', currentUser.email);
    
    if (currentUser.id !== loginData.user.id) {
      console.log('\n⚠️⚠️⚠️ PROBLEMA ENCONTRADO:');
      console.log('   Login devolvió ID:', loginData.user.id);
      console.log('   /current devolvió ID:', currentUser.id);
      console.log('   SON DIFERENTES!');
    }
    
    // 3. Simular que el componente recibe este usuario y hace una reserva
    console.log('\n3️⃣ OBTENIENDO CLASES DISPONIBLES...');
    const today = new Date().toISOString().split('T')[0];
    const slotsRes = await fetch(`http://localhost:9002/api/timeslots?date=${today}&clubId=padel-estrella-madrid`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const slotsData = await slotsRes.json();
    const slots = slotsData.slots || slotsData;
    const availableSlot = slots.find(s => !s.courtNumber) || slots[0];
    
    console.log(`✅ ${slots.length} clases disponibles`);
    console.log('   Seleccionando:', availableSlot.id);
    
    // 4. RESERVA - Simular exactamente lo que hace ClassCardReal
    console.log('\n4️⃣ HACIENDO RESERVA (simulando ClassCardReal)...');
    console.log('   📤 currentUser.id que se enviará:', currentUser.id);
    console.log('   📤 currentUser.name:', currentUser.name);
    console.log('   📤 timeSlotId:', availableSlot.id);
    
    const bookingRes = await fetch('http://localhost:9002/api/classes/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cookie': cookies || ''
      },
      credentials: 'include',
      body: JSON.stringify({
        userId: currentUser.id,  // Este es el que se envía desde el frontend
        timeSlotId: availableSlot.id,
        groupSize: 1
      })
    });
    
    console.log('\n5️⃣ RESPUESTA DEL SERVIDOR:');
    console.log('   Status:', bookingRes.status);
    
    if (bookingRes.ok) {
      const bookingData = await bookingRes.json();
      console.log('✅ Reserva creada');
      console.log('   Booking ID:', bookingData.bookingId);
      
      // 6. Verificar en la BD
      console.log('\n6️⃣ VERIFICANDO EN LA BASE DE DATOS...');
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const booking = await prisma.booking.findUnique({
        where: { id: bookingData.bookingId },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      });
      
      console.log('\n📋 RESULTADO FINAL:');
      console.log('─'.repeat(70));
      console.log('Usuario esperado (currentUser):', currentUser.name, `(${currentUser.id})`);
      console.log('Usuario en la BD:', booking.user.name, `(${booking.user.id})`);
      
      if (booking.user.id === currentUser.id) {
        console.log('\n✅✅✅ TODO CORRECTO: La reserva se guardó con el usuario correcto');
      } else {
        console.log('\n❌❌❌ PROBLEMA CONFIRMADO:');
        console.log('   Se envió userId:', currentUser.id, `(${currentUser.name})`);
        console.log('   Se guardó userId:', booking.user.id, `(${booking.user.name})`);
        console.log('\n🔍 Ahora buscaré en el código dónde se hace la sustitución...');
      }
      
      await prisma.$disconnect();
      
    } else {
      const error = await bookingRes.json();
      console.log('❌ Error:', error);
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

simulateBrowserFlow();
