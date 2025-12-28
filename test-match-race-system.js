/**
 * Script para probar el sistema de carrera de partidas
 * 
 * Escenario:
 * 1. Crear 3 partidas para las 9:00h
 * 2. Inscribir jugadores en cada partida (competencia)
 * 3. Una partida se completa primero (4 jugadores)
 * 4. Verificar que:
 *    - La partida ganadora recibe pista
 *    - Las partidas perdedoras se cancelan
 *    - Se reembolsan los créditos a los jugadores de partidas perdedoras
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMatchRaceSystem() {
  console.log('\n🏁 === PRUEBA SISTEMA DE CARRERA DE PARTIDAS ===\n');

  try {
    // 1. Obtener club y usuarios
    const club = await prisma.club.findFirst();
    if (!club) {
      console.error('❌ No hay clubs en la base de datos');
      return;
    }

    console.log(`✅ Club: ${club.name} (${club.id})`);

    // Obtener usuarios de prueba
    const users = await prisma.user.findMany({
      take: 10,
      where: { 
        role: 'PLAYER',
        credits: { gte: 1000 } // Con suficientes créditos
      }
    });

    if (users.length < 10) {
      console.error(`❌ Se necesitan al menos 10 usuarios con créditos. Solo hay ${users.length}`);
      return;
    }

    console.log(`✅ ${users.length} usuarios disponibles\n`);

    // 2. Crear fecha para mañana a las 9:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const matchStart = new Date(tomorrow);
    const matchEnd = new Date(tomorrow);
    matchEnd.setMinutes(matchEnd.getMinutes() + 90);

    console.log(`📅 Horario de las partidas: ${matchStart.toLocaleString()}\n`);

    // 3. Crear 3 partidas para el mismo horario (competencia)
    console.log('🎾 Creando 3 partidas competidoras...\n');
    
    const match1 = await prisma.matchGame.create({
      data: {
        clubId: club.id,
        start: matchStart,
        end: matchEnd,
        duration: 90,
        maxPlayers: 4,
        courtRentalPrice: 20,
        pricePerPlayer: 5,
        isOpen: true,
        creditsCost: 50
      }
    });
    console.log(`✅ Partida 1 creada: ${match1.id}`);

    const match2 = await prisma.matchGame.create({
      data: {
        clubId: club.id,
        start: matchStart,
        end: matchEnd,
        duration: 90,
        maxPlayers: 4,
        courtRentalPrice: 20,
        pricePerPlayer: 5,
        isOpen: true,
        creditsCost: 50
      }
    });
    console.log(`✅ Partida 2 creada: ${match2.id}`);

    const match3 = await prisma.matchGame.create({
      data: {
        clubId: club.id,
        start: matchStart,
        end: matchEnd,
        duration: 90,
        maxPlayers: 4,
        courtRentalPrice: 20,
        pricePerPlayer: 5,
        isOpen: true,
        creditsCost: 50
      }
    });
    console.log(`✅ Partida 3 creada: ${match3.id}\n`);

    // 4. Inscribir jugadores en cada partida
    console.log('👥 Inscribiendo jugadores...\n');

    // Partida 1: 4 jugadores (GANADORA)
    console.log('🏆 Partida 1 - Inscribiendo 4 jugadores:');
    for (let i = 0; i < 4; i++) {
      const response = await fetch('http://localhost:9002/api/matchgames/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: users[i].id,
          matchGameId: match1.id,
          paymentMethod: 'CREDITS'
        })
      });

      const result = await response.json();
      if (response.ok) {
        console.log(`   ✅ Jugador ${i+1} (${users[i].name}) inscrito`);
        if (result.confirmed) {
          console.log(`   🎉 ¡PARTIDA CONFIRMADA! Pista ${result.courtNumber} asignada`);
        }
      } else {
        console.log(`   ❌ Error: ${result.error}`);
      }

      // Pequeña pausa entre inscripciones
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Partida 2: 2 jugadores (PERDEDORA)
    console.log('\n❌ Partida 2 - Inscribiendo 2 jugadores (incompleta):');
    for (let i = 4; i < 6; i++) {
      const response = await fetch('http://localhost:9002/api/matchgames/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: users[i].id,
          matchGameId: match2.id,
          paymentMethod: 'CREDITS'
        })
      });

      const result = await response.json();
      if (response.ok) {
        console.log(`   ✅ Jugador ${i-3} (${users[i].name}) inscrito`);
      } else {
        console.log(`   ❌ Error: ${result.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Partida 3: 3 jugadores (PERDEDORA)
    console.log('\n❌ Partida 3 - Inscribiendo 3 jugadores (incompleta):');
    for (let i = 6; i < 9; i++) {
      const response = await fetch('http://localhost:9002/api/matchgames/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: users[i].id,
          matchGameId: match3.id,
          paymentMethod: 'CREDITS'
        })
      });

      const result = await response.json();
      if (response.ok) {
        console.log(`   ✅ Jugador ${i-5} (${users[i].name}) inscrito`);
      } else {
        console.log(`   ❌ Error: ${result.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 5. Verificar resultados
    console.log('\n\n📊 === RESULTADOS DEL SISTEMA DE CARRERA ===\n');

    const finalMatch1 = await prisma.matchGame.findUnique({
      where: { id: match1.id },
      include: {
        bookings: { where: { status: { not: 'CANCELLED' } } }
      }
    });

    const finalMatch2 = await prisma.matchGame.findUnique({
      where: { id: match2.id },
      include: {
        bookings: true
      }
    });

    const finalMatch3 = await prisma.matchGame.findUnique({
      where: { id: match3.id },
      include: {
        bookings: true
      }
    });

    console.log('🏆 Partida 1 (GANADORA):');
    console.log(`   - Jugadores: ${finalMatch1.bookings.length}/${finalMatch1.maxPlayers}`);
    console.log(`   - Pista asignada: ${finalMatch1.courtNumber ? `Sí (Pista ${finalMatch1.courtNumber})` : 'No'}`);
    console.log(`   - Estado bookings: ${finalMatch1.bookings.map(b => b.status).join(', ')}`);

    console.log('\n❌ Partida 2 (PERDEDORA):');
    console.log(`   - Jugadores totales: ${finalMatch2.bookings.length}`);
    console.log(`   - Bookings cancelados: ${finalMatch2.bookings.filter(b => b.status === 'CANCELLED').length}`);
    console.log(`   - Bookings activos: ${finalMatch2.bookings.filter(b => b.status !== 'CANCELLED').length}`);
    console.log(`   - Pista asignada: ${finalMatch2.courtNumber ? `Sí (Pista ${finalMatch2.courtNumber})` : 'No'}`);

    console.log('\n❌ Partida 3 (PERDEDORA):');
    console.log(`   - Jugadores totales: ${finalMatch3.bookings.length}`);
    console.log(`   - Bookings cancelados: ${finalMatch3.bookings.filter(b => b.status === 'CANCELLED').length}`);
    console.log(`   - Bookings activos: ${finalMatch3.bookings.filter(b => b.status !== 'CANCELLED').length}`);
    console.log(`   - Pista asignada: ${finalMatch3.courtNumber ? `Sí (Pista ${finalMatch3.courtNumber})` : 'No'}`);

    // Verificar reembolsos
    console.log('\n💰 Verificando reembolsos...');
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: { in: users.map(u => u.id) },
        concept: { contains: 'ganó' }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`\n📜 Transacciones de reembolso: ${transactions.length}`);
    transactions.forEach(t => {
      console.log(`   - ${t.concept} (${t.amount} ${t.type})`);
    });

    console.log('\n✅ Prueba completada');

  } catch (error) {
    console.error('\n❌ Error en la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
testMatchRaceSystem();
