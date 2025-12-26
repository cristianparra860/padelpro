const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestMatchGame() {
  try {
    console.log('🎾 Creando partida de prueba...\n');

    // Obtener el club
    const club = await prisma.club.findFirst({
      where: { id: 'club-1' }
    });

    if (!club) {
      console.log('❌ No se encontró el club');
      return;
    }

    console.log('✅ Club encontrado:', club.name);

    // Crear partida para hoy a las 18:00 (6 PM)
    const today = new Date();
    today.setHours(18, 0, 0, 0);
    
    const matchEnd = new Date(today);
    matchEnd.setMinutes(matchEnd.getMinutes() + 90); // 90 minutos de duración

    const matchGame = await prisma.matchGame.create({
      data: {
        clubId: club.id,
        start: today,
        end: matchEnd,
        duration: 90,
        maxPlayers: 4,
        pricePerPlayer: 10.0,
        isOpen: true,
        creditsCost: 1,
        level: null, // Se asignará cuando entre el primer jugador
        genderCategory: null, // Se asignará cuando entre el primer jugador
        courtId: null,
        courtNumber: null
      }
    });

    console.log('\n✅ Partida creada exitosamente:');
    console.log('   ID:', matchGame.id);
    console.log('   Fecha:', matchGame.start.toLocaleString('es-ES'));
    console.log('   Duración:', matchGame.duration, 'minutos');
    console.log('   Precio por jugador:', matchGame.pricePerPlayer, '€');
    console.log('   Estado: ABIERTA (esperando clasificación)');
    console.log('   Máximo jugadores:', matchGame.maxPlayers);
    console.log('\n🎯 Ahora ve a /matchgames para verla!');

    // Crear otra para mañana por la mañana
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 30, 0, 0);
    
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setMinutes(tomorrowEnd.getMinutes() + 90);

    const matchGame2 = await prisma.matchGame.create({
      data: {
        clubId: club.id,
        start: tomorrow,
        end: tomorrowEnd,
        duration: 90,
        maxPlayers: 4,
        pricePerPlayer: 12.0,
        isOpen: true,
        creditsCost: 1,
        level: null,
        genderCategory: null,
        courtId: null,
        courtNumber: null
      }
    });

    console.log('\n✅ Segunda partida creada (mañana):');
    console.log('   ID:', matchGame2.id);
    console.log('   Fecha:', matchGame2.start.toLocaleString('es-ES'));
    console.log('   Precio por jugador:', matchGame2.pricePerPlayer, '€');

    // Crear una clasificada para probar visualización
    const todayAfternoon = new Date();
    todayAfternoon.setHours(20, 0, 0, 0);
    
    const afternoonEnd = new Date(todayAfternoon);
    afternoonEnd.setMinutes(afternoonEnd.getMinutes() + 90);

    const matchGame3 = await prisma.matchGame.create({
      data: {
        clubId: club.id,
        start: todayAfternoon,
        end: afternoonEnd,
        duration: 90,
        maxPlayers: 4,
        pricePerPlayer: 15.0,
        isOpen: false,
        creditsCost: 1,
        level: 'intermedio',
        genderCategory: 'masculino',
        courtId: null,
        courtNumber: null
      }
    });

    console.log('\n✅ Tercera partida creada (clasificada):');
    console.log('   ID:', matchGame3.id);
    console.log('   Fecha:', matchGame3.start.toLocaleString('es-ES'));
    console.log('   Nivel: intermedio');
    console.log('   Género: masculino');
    console.log('   Precio por jugador:', matchGame3.pricePerPlayer, '€');

    console.log('\n🎉 Total: 3 partidas de prueba creadas');
    console.log('   - 2 abiertas (sin clasificar)');
    console.log('   - 1 clasificada (nivel intermedio, masculino)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestMatchGame();
