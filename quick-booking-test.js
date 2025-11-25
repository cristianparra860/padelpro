// Script simple para hacer UNA reserva y ver logs
const fetch = require('node-fetch');

async function quickBooking() {
  try {
    // Login
    const login = await fetch('http://localhost:9002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'jugador3@padelpro.com', password: 'Pass123!' })
    });
    
    const { token, user } = await login.json();
    console.log('✅ Logged in as:', user.name);
    console.log('   Level:', user.level);
    console.log('   Gender:', user.gender);
    
    // Buscar clase del 2 dic sin reservas
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const dec2 = new Date('2025-12-02T00:00:00Z').getTime();
    const slots = await prisma.$queryRaw`
      SELECT ts.id, ts.level, ts.start
      FROM TimeSlot ts
      LEFT JOIN Booking b ON ts.id = b.timeSlotId AND b.status IN ('PENDING', 'CONFIRMED')
      WHERE ts.courtId IS NULL
      AND ts.start >= ${dec2}
      AND ts.start < ${dec2 + 86400000}
      GROUP BY ts.id
      HAVING COUNT(b.id) = 0
      LIMIT 1
    `;
    
    if (slots.length === 0) {
      console.log('❌ No hay clases disponibles el 2 dic');
      await prisma.$disconnect();
      return;
    }
    
    const slot = slots[0];
    console.log('\n📋 Reservando clase:');
    console.log('   ID:', slot.id);
    console.log('   Hora:', new Date(Number(slot.start)).toLocaleString());
    console.log('   Nivel actual:', slot.level);
    console.log('\n⏰ MIRA LOS LOGS DEL SERVIDOR AHORA...\n');
    
    // Hacer reserva
    const booking = await fetch('http://localhost:9002/api/classes/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: user.id,
        timeSlotId: slot.id,
        groupSize: 1
      })
    });
    
    const result = await booking.json();
    
    if (booking.ok) {
      console.log('✅ RESERVA EXITOSA:', result.bookingId);
      
      // Verificar tarjetas creadas
      const newSlots = await prisma.timeSlot.findMany({
        where: {
          start: new Date(Number(slot.start)),
          courtId: null
        },
        select: { id: true, level: true, genderCategory: true }
      });
      
      console.log('\n📊 Tarjetas después de la reserva:');
      newSlots.forEach((s, i) => {
        console.log(`   ${i + 1}. Nivel: ${s.level?.padEnd(12)} Categoría: ${s.genderCategory || 'null'}`);
      });
      
    } else {
      console.log('❌ Error:', result.error);
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

quickBooking();
