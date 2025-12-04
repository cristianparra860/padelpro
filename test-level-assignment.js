const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testLevelAssignment() {
  try {
    console.log('🎯 TEST: Asignación de rango de nivel a clase\n');
    
    // Buscar una clase sin reservas (nivel "abierto")
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowTimestamp = tomorrow.getTime();
    
    const availableSlots = await prisma.$queryRaw`
      SELECT * FROM TimeSlot 
      WHERE courtId IS NULL
      AND start >= ${todayTimestamp}
      AND start < ${tomorrowTimestamp}
      AND level = 'abierto'
      ORDER BY start
      LIMIT 5
    `;
    
    console.log(`📋 Clases "abiertas" (sin nivel asignado): ${availableSlots.length}\n`);
    
    if (availableSlots.length === 0) {
      console.log('⚠️ No hay clases abiertas disponibles para probar');
      return;
    }
    
    // Seleccionar la primera clase
    const slot = availableSlots[0];
    const slotTime = new Date(slot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    console.log(`✅ Clase seleccionada: ${slotTime}`);
    console.log(`   - ID: ${slot.id}`);
    console.log(`   - Level actual: "${slot.level}"`);
    console.log(`   - Gender: ${slot.genderCategory || 'null'}\n`);
    
    // Verificar reservas actuales
    const currentBookings = await prisma.booking.count({
      where: {
        timeSlotId: slot.id,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });
    
    if (currentBookings > 0) {
      console.log(`⚠️ Esta clase ya tiene ${currentBookings} reservas`);
      console.log('   Buscando otra clase...\n');
      
      // Buscar otra sin reservas
      for (const altSlot of availableSlots.slice(1)) {
        const altBookings = await prisma.booking.count({
          where: {
            timeSlotId: altSlot.id,
            status: { in: ['PENDING', 'CONFIRMED'] }
          }
        });
        
        if (altBookings === 0) {
          const altTime = new Date(altSlot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          console.log(`✅ Clase alternativa: ${altTime}`);
          console.log(`   - ID: ${altSlot.id}`);
          console.log(`   - Level: "${altSlot.level}"\n`);
          
          slot.id = altSlot.id;
          slot.start = altSlot.start;
          slot.level = altSlot.level;
          break;
        }
      }
    }
    
    // Buscar usuarios de prueba con diferentes niveles
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: ['jugador1@padelpro.com', 'jugador2@padelpro.com', 'alex@example.com']
        }
      }
    });
    
    console.log('👥 Usuarios disponibles para prueba:\n');
    users.forEach(u => {
      console.log(`   - ${u.name} (${u.email})`);
      console.log(`     Level: ${u.level} → Rango esperado: ${getLevelRange(u.level)}`);
      console.log(`     Créditos: ${u.credits}€\n`);
    });
    
    // Seleccionar usuario con nivel intermedio (María García)
    const testUser = users.find(u => u.email === 'jugador2@padelpro.com') || users[0];
    
    console.log(`\n🎯 Usuario seleccionado para prueba: ${testUser.name}`);
    console.log(`   - Level: ${testUser.level}`);
    console.log(`   - Rango esperado: ${getLevelRange(testUser.level)}\n`);
    
    console.log('📝 INSTRUCCIONES PARA PRUEBA MANUAL:\n');
    console.log('1. Abre http://localhost:9002 en el navegador');
    console.log(`2. Inicia sesión con: ${testUser.email}`);
    console.log(`3. Busca la clase de las ${slotTime}`);
    console.log('4. Haz clic en "Reservar" (cualquier modalidad)');
    console.log('5. Observa la consola del navegador (F12)\n');
    
    console.log('🔍 LOGS CLAVE A VERIFICAR:\n');
    console.log('   Backend (terminal del servidor):');
    console.log('   ✓ "🎯 Primera reserva detectada"');
    console.log('   ✓ "📊 Nivel del usuario: X.X"');
    console.log('   ✓ "✅ Rango de nivel asignado: X-X"');
    console.log('   ✓ "📦 updatedSlotData siendo devuelto al frontend"');
    console.log('   ✓ "level: X-X" (debe mostrar el rango correcto)\n');
    
    console.log('   Frontend (consola del navegador):');
    console.log('   ✓ "🎉 BOOKING EXITOSO"');
    console.log('   ✓ "📦 Respuesta del API" con updatedSlot');
    console.log('   ✓ "🔄 handleBookingSuccess LLAMADO EN CLASSESDISPLAY"');
    console.log('   ✓ "level: X-X" (debe coincidir con el backend)');
    console.log('   ✓ "🔄🔄🔄 ClassCard useEffect TRIGGERED"');
    console.log('   ✓ "📦 classData completo" con level: "X-X"\n');
    
    console.log('📊 RESULTADO ESPERADO:\n');
    console.log(`   La tarjeta debe mostrar: "Nivel: ${getLevelRange(testUser.level)}"`);
    console.log('   En lugar de: "Nivel: Abierto"\n');
    
    // Esperar 3 segundos antes de verificar
    console.log('⏳ Haz la reserva ahora...');
    console.log('   Presiona Ctrl+C cuando termines de verificar\n');
    
    // Bucle para verificar cambios cada 5 segundos
    let lastLevel = slot.level;
    const checkInterval = setInterval(async () => {
      try {
        const updated = await prisma.timeSlot.findUnique({
          where: { id: slot.id }
        });
        
        if (updated && updated.level !== lastLevel) {
          console.log(`\n✅ ¡NIVEL ACTUALIZADO EN LA BD!`);
          console.log(`   Antes: "${lastLevel}"`);
          console.log(`   Ahora: "${updated.level}"\n`);
          
          const bookings = await prisma.booking.findMany({
            where: {
              timeSlotId: slot.id,
              status: { in: ['PENDING', 'CONFIRMED'] }
            },
            include: {
              user: { select: { name: true, level: true } }
            }
          });
          
          console.log(`📊 Reservas actuales: ${bookings.length}`);
          bookings.forEach((b, i) => {
            console.log(`   ${i + 1}. ${b.user.name} (nivel ${b.user.level})`);
          });
          
          console.log('\n🎉 TEST EXITOSO - El nivel se asignó correctamente en el backend');
          console.log('🔍 Ahora verifica que la tarjeta en el navegador muestre el nuevo nivel\n');
          
          lastLevel = updated.level;
        }
      } catch (err) {
        console.error('Error verificando:', err.message);
      }
    }, 3000);
    
    // Mantener el script corriendo
    process.on('SIGINT', async () => {
      clearInterval(checkInterval);
      console.log('\n\n👋 Finalizando test...');
      await prisma.$disconnect();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

function getLevelRange(level) {
  const numLevel = parseFloat(level);
  if (numLevel >= 1 && numLevel < 3) return '1-3';
  if (numLevel >= 3 && numLevel < 5) return '3-5';
  if (numLevel >= 5 && numLevel <= 7) return '5-7';
  return 'Abierto';
}

testLevelAssignment();
