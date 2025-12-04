/**
 * Script para probar el filtro de jugadores con reservas reales
 * Crea reservas que bloquean ciertas opciones de jugadores
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFilterWithBookings() {
  try {
    console.log('🎯 Creando escenario de prueba para el filtro de jugadores...\n');

    // 1. Buscar usuario de prueba
    const testUser = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' }
    });

    if (!testUser) {
      console.log('❌ No se encontró el usuario de prueba');
      return;
    }

    console.log(`✅ Usuario encontrado: ${testUser.name} (${testUser.email})\n`);

    // 2. Buscar clases disponibles (diciembre 7, 2025)
    const targetDate = new Date('2025-12-07T00:00:00.000Z');
    const nextDay = new Date('2025-12-08T00:00:00.000Z');

    const slots = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: targetDate.toISOString(),
          lt: nextDay.toISOString()
        },
        courtId: null, // Solo clases sin confirmar
        instructorId: 'instructor-cristian-parra' // El instructor que estás viendo
      },
      take: 6,
      orderBy: { start: 'asc' }
    });

    if (slots.length < 3) {
      console.log('❌ No hay suficientes clases para crear el escenario');
      return;
    }

    console.log(`📅 Encontradas ${slots.length} clases para modificar\n`);

    // 3. Escenario de prueba:
    // - Clase 1: 1 reserva de 2 jugadores (bloquea opción 1, queda disponible 2,3,4)
    // - Clase 2: 2 reservas de 2 jugadores (bloquea 1,2, solo disponible 3,4)
    // - Clase 3: 1 reserva de 3 jugadores (bloquea 1,2, solo disponible 3,4)
    // - Clase 4: Sin reservas (disponible 1,2,3,4)

    // Limpiar reservas existentes de estas clases
    await prisma.booking.deleteMany({
      where: {
        timeSlotId: { in: slots.map(s => s.id) },
        status: { in: ['CONFIRMED', 'PENDING'] }
      }
    });

    console.log('🧹 Reservas anteriores limpiadas\n');

    // Clase 1: 1 reserva de groupSize=2
    if (slots[0]) {
      await prisma.booking.create({
        data: {
          userId: testUser.id,
          timeSlotId: slots[0].id,
          groupSize: 2,
          status: 'CONFIRMED'
        }
      });
      console.log(`✅ Clase 1 (${new Date(slots[0].start).toLocaleTimeString()}): 1 reserva de 2 jugadores`);
      console.log(`   → Disponible: 2 (1/2), 3 (0/3), 4 (0/4)`);
      console.log(`   → NO disponible: 1 jugador (ocupado)\n`);
    }

    // Clase 2: 2 reservas de groupSize=2 (llena esta opción)
    if (slots[1]) {
      await prisma.booking.createMany({
        data: [
          {
            userId: testUser.id,
            timeSlotId: slots[1].id,
            groupSize: 2,
            status: 'CONFIRMED'
          },
          {
            userId: testUser.id,
            timeSlotId: slots[1].id,
            groupSize: 2,
            status: 'CONFIRMED'
          }
        ]
      });
      console.log(`✅ Clase 2 (${new Date(slots[1].start).toLocaleTimeString()}): 2 reservas de 2 jugadores`);
      console.log(`   → Disponible: 3 (0/3), 4 (0/4)`);
      console.log(`   → NO disponible: 1 y 2 jugadores (ocupados)\n`);
    }

    // Clase 3: 1 reserva de groupSize=3
    if (slots[2]) {
      await prisma.booking.create({
        data: {
          userId: testUser.id,
          timeSlotId: slots[2].id,
          groupSize: 3,
          status: 'CONFIRMED'
        }
      });
      console.log(`✅ Clase 3 (${new Date(slots[2].start).toLocaleTimeString()}): 1 reserva de 3 jugadores`);
      console.log(`   → Disponible: 3 (1/3), 4 (0/4)`);
      console.log(`   → NO disponible: 1 y 2 jugadores (no caben)\n`);
    }

    // Clase 4: Sin reservas (todas disponibles)
    if (slots[3]) {
      console.log(`✅ Clase 4 (${new Date(slots[3].start).toLocaleTimeString()}): Sin reservas`);
      console.log(`   → Disponible: 1 (0/1), 2 (0/2), 3 (0/3), 4 (0/4)\n`);
    }

    console.log('\n📊 ESCENARIO DE PRUEBA CREADO\n');
    console.log('🎮 INSTRUCCIONES DE PRUEBA:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('1️⃣  Abre el navegador con el filtro de jugadores en [1,2,3,4]');
    console.log('   → Deberías ver LAS 4 CLASES\n');
    
    console.log('2️⃣  Desmarca "1 jugador" → quedan [2,3,4]');
    console.log('   → Deberías ver 3 CLASES (Clase 1, 2, 3)');
    console.log('   → La Clase 4 DESAPARECE (solo tiene opción de 1 disponible)\n');
    
    console.log('3️⃣  Desmarca "2 jugadores" → quedan [3,4]');
    console.log('   → Deberías ver 3 CLASES (Clase 2, 3, 4)');
    console.log('   → La Clase 1 DESAPARECE (solo tiene 2 disponible, no 3 o 4)\n');
    
    console.log('4️⃣  Desmarca "3 jugadores" → queda solo [4]');
    console.log('   → Deberías ver 3 CLASES (Clase 2, 3, 4)');
    console.log('   → Todas tienen disponible la opción de 4 jugadores\n');
    
    console.log('5️⃣  Vuelve a marcar todo [1,2,3,4]');
    console.log('   → Deberías ver LAS 4 CLASES de nuevo\n');
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n✅ ¡El filtro ahora debería funcionar perfectamente!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFilterWithBookings();
