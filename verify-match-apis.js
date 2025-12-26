const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAPIs() {
  console.log('\n🔍 Verificando APIs de Partidas\n');
  console.log('='.repeat(60));

  try {
    // 1. Verificar endpoint POST /api/matchgames/book existe
    console.log('\n1️⃣ Verificando estructura de endpoints...');
    const fs = require('fs');
    
    const bookEndpoint = 'src/app/api/matchgames/book/route.ts';
    const leaveEndpoint = 'src/app/api/matchgames/[matchGameId]/leave/route.ts';
    
    if (fs.existsSync(bookEndpoint)) {
      console.log(`✅ Endpoint de booking existe: ${bookEndpoint}`);
    } else {
      console.log(`❌ Endpoint de booking NO existe: ${bookEndpoint}`);
    }
    
    if (fs.existsSync(leaveEndpoint)) {
      console.log(`✅ Endpoint de cancelación existe: ${leaveEndpoint}`);
    } else {
      console.log(`❌ Endpoint de cancelación NO existe: ${leaveEndpoint}`);
    }

    // 2. Verificar datos de prueba
    console.log('\n2️⃣ Verificando datos de prueba...');
    
    const user = await prisma.user.findFirst({
      where: { email: 'alex.garcia@email.com' }
    });
    
    if (user) {
      console.log(`✅ Usuario de prueba encontrado:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Créditos: ${user.credits}`);
    } else {
      console.log(`❌ Usuario de prueba NO encontrado`);
    }

    const matches = await prisma.matchGame.findMany({
      where: {
        start: { gte: new Date() }
      },
      include: {
        bookings: true
      }
    });

    console.log(`\n✅ Partidas disponibles: ${matches.length}`);
    
    const availableMatches = matches.filter(m => m.bookings.length < m.maxPlayers);
    console.log(`   Partidas con plazas libres: ${availableMatches.length}`);
    
    if (availableMatches.length > 0) {
      const match = availableMatches[0];
      console.log(`\n   Ejemplo de partida disponible:`);
      console.log(`   ID: ${match.id}`);
      console.log(`   Precio: ${match.pricePerPlayer}€/jugador`);
      console.log(`   Jugadores: ${match.bookings.length}/${match.maxPlayers}`);
      console.log(`   Nivel: ${match.level || 'Abierta'}`);
      console.log(`   Pista: ${match.courtNumber || 'No asignada'}`);
    }

    // 3. Verificar modelo de datos
    console.log('\n3️⃣ Verificando esquema de base de datos...');
    
    const matchGameFields = Object.keys(await prisma.matchGame.fields());
    const requiredFields = ['pricePerPlayer', 'maxPlayers', 'courtNumber', 'isOpen'];
    
    const missingFields = requiredFields.filter(f => !matchGameFields.includes(f));
    
    if (missingFields.length === 0) {
      console.log(`✅ Todos los campos requeridos existen en MatchGame`);
    } else {
      console.log(`❌ Campos faltantes en MatchGame: ${missingFields.join(', ')}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICACIÓN COMPLETADA\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAPIs();
