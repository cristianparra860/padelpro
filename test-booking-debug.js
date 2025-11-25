// Script para depurar el problema de reserva con Juan Pérez
const fetch = require('node-fetch');

async function testBookingWithJuan() {
  try {
    console.log('\n🔍 TEST DE RESERVA CON JUAN PÉREZ\n');
    console.log('='.repeat(60));
    
    // Primero hacer login con Juan Pérez
    console.log('\n1️⃣ Login con Juan Pérez...');
    const loginResponse = await fetch('http://localhost:9002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jugador1@padelpro.com',
        password: 'Pass123!'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Error en login:', loginResponse.status);
      const error = await loginResponse.text();
      console.log(error);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login exitoso');
    console.log('   Token recibido:', loginData.token ? 'Sí' : 'No');
    console.log('   User ID:', loginData.user?.id);
    console.log('   User Name:', loginData.user?.name);
    console.log('   User Email:', loginData.user?.email);
    
    const token = loginData.token;
    const juanUserId = loginData.user?.id;
    
    // Obtener clases disponibles
    console.log('\n2️⃣ Obteniendo clases disponibles...');
    const today = new Date().toISOString().split('T')[0];
    const slotsResponse = await fetch(`http://localhost:9002/api/timeslots?date=${today}&clubId=padel-estrella-madrid`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!slotsResponse.ok) {
      console.log('❌ Error obteniendo clases:', slotsResponse.status);
      return;
    }
    
    const slotsData = await slotsResponse.json();
    const slots = slotsData.slots || slotsData; // Puede venir en un objeto o directo
    console.log(`✅ ${slots.length} clases disponibles`);
    
    if (slots.length === 0) {
      console.log('❌ No hay clases para reservar');
      return;
    }
    
    // Tomar la primera clase disponible sin pista asignada
    const firstSlot = slots.find(s => !s.courtNumber) || slots[0];
    console.log('\n3️⃣ Intentando reservar clase:');
    console.log('   TimeSlot ID:', firstSlot.id);
    console.log('   Horario:', firstSlot.start);
    console.log('   Nivel:', firstSlot.level);
    
    // Hacer la reserva
    console.log('\n4️⃣ Enviando petición de reserva...');
    console.log('   📤 Datos enviados:');
    console.log('   - userId:', juanUserId);
    console.log('   - timeSlotId:', firstSlot.id);
    console.log('   - groupSize: 1');
    
    const bookingResponse = await fetch('http://localhost:9002/api/classes/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: juanUserId,
        timeSlotId: firstSlot.id,
        groupSize: 1
      })
    });
    
    console.log('\n5️⃣ Respuesta del servidor:');
    console.log('   Status:', bookingResponse.status);
    
    const bookingData = await bookingResponse.json();
    
    if (bookingResponse.ok) {
      console.log('✅ Reserva creada exitosamente');
      console.log('   Booking ID:', bookingData.bookingId);
      
      // Verificar en la base de datos quién hizo la reserva
      console.log('\n6️⃣ Verificando en la base de datos...');
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const booking = await prisma.booking.findUnique({
        where: { id: bookingData.bookingId },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });
      
      console.log('\n📋 RESULTADO EN BD:');
      console.log('─'.repeat(60));
      console.log('Usuario en la reserva:', booking.user.name);
      console.log('Email:', booking.user.email);
      console.log('User ID:', booking.user.id);
      
      if (booking.user.id === juanUserId) {
        console.log('\n✅✅✅ ÉXITO: La reserva se guardó con Juan Pérez');
      } else {
        console.log('\n❌❌❌ ERROR: La reserva se guardó con otro usuario!');
        console.log('   Esperado:', juanUserId, '(Juan Pérez)');
        console.log('   Guardado:', booking.user.id, '(' + booking.user.name + ')');
      }
      
      await prisma.$disconnect();
      
    } else {
      console.log('❌ Error en la reserva:', bookingData.error);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testBookingWithJuan();
