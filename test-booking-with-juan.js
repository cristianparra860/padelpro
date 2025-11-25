// Script para hacer una reserva de prueba con Juan Pérez
const fetch = require('node-fetch');

async function testBooking() {
  try {
    console.log('\n🧪 TEST: Simulando reserva con Juan Pérez\n');
    console.log('='.repeat(60));
    
    // Paso 1: Login como Juan Pérez
    console.log('\n1️⃣ Haciendo login como Juan Pérez...');
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
    console.log('✅ Login exitoso!');
    console.log('   Usuario:', loginData.user.name);
    console.log('   Email:', loginData.user.email);
    console.log('   ID:', loginData.user.id);
    console.log('   Token recibido:', loginData.token.substring(0, 20) + '...');
    
    const juanId = loginData.user.id;
    const token = loginData.token;
    
    // Paso 2: Obtener una clase disponible
    console.log('\n2️⃣ Buscando clases disponibles...');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    const slotsResponse = await fetch(`http://localhost:9002/api/timeslots?date=${dateStr}&clubId=padel-estrella-madrid`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!slotsResponse.ok) {
      console.log('❌ Error obteniendo clases:', slotsResponse.status);
      return;
    }
    
    const slotsData = await slotsResponse.json();
    const availableSlots = slotsData.timeSlots?.filter(slot => !slot.courtId) || [];
    
    console.log(`✅ Encontradas ${availableSlots.length} clases disponibles`);
    
    if (availableSlots.length === 0) {
      console.log('⚠️ No hay clases disponibles para reservar');
      return;
    }
    
    const testSlot = availableSlots[0];
    console.log('   Clase seleccionada:', testSlot.id);
    console.log('   Horario:', new Date(testSlot.start).toLocaleString('es-ES'));
    console.log('   Nivel:', testSlot.level);
    
    // Paso 3: Hacer la reserva
    console.log('\n3️⃣ Haciendo reserva...');
    console.log('   📋 Datos que se van a enviar:');
    console.log('      userId:', juanId);
    console.log('      timeSlotId:', testSlot.id);
    console.log('      groupSize: 1');
    
    const bookingResponse = await fetch('http://localhost:9002/api/classes/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: juanId,
        timeSlotId: testSlot.id,
        groupSize: 1
      })
    });
    
    const bookingData = await bookingResponse.json();
    
    if (!bookingResponse.ok) {
      console.log('❌ Error en la reserva:', bookingResponse.status);
      console.log(bookingData);
      return;
    }
    
    console.log('✅ Reserva exitosa!');
    console.log('   Booking ID:', bookingData.bookingId);
    
    // Paso 4: Verificar en la base de datos
    console.log('\n4️⃣ Verificando en la base de datos...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const booking = await prisma.booking.findUnique({
      where: { id: bookingData.bookingId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log('\n📊 RESULTADO:');
    console.log('─'.repeat(60));
    console.log('Booking ID:', booking.id);
    console.log('Usuario en DB:', booking.user.name);
    console.log('Email en DB:', booking.user.email);
    console.log('User ID en DB:', booking.userId);
    
    if (booking.userId === juanId) {
      console.log('\n✅✅✅ ¡ÉXITO! La reserva se guardó con Juan Pérez');
    } else {
      console.log('\n❌❌❌ PROBLEMA: La reserva se guardó con otro usuario');
      console.log('   Esperado:', juanId);
      console.log('   Obtenido:', booking.userId);
    }
    
    console.log('\n' + '='.repeat(60));
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testBooking();
