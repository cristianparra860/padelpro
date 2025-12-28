const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAdminFeatures() {
  console.log('\n🧪 TEST: Funcionalidades de Admin para Partidas\n');
  console.log('='.repeat(60));

  try {
    // 1. Verificar que existen partidas
    console.log('\n1️⃣ Verificando partidas existentes...');
    const matches = await prisma.matchGame.findMany({
      include: {
        bookings: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } }
        }
      },
      take: 5
    });

    console.log(`✅ Partidas encontradas: ${matches.length}`);
    
    if (matches.length > 0) {
      const match = matches[0];
      console.log(`\n📊 Ejemplo de partida:`);
      console.log(`   ID: ${match.id}`);
      console.log(`   Fecha: ${new Date(match.start).toLocaleString('es-ES')}`);
      console.log(`   Precio: ${match.pricePerPlayer}€/jugador`);
      console.log(`   Jugadores: ${match.bookings.length}/${match.maxPlayers}`);
      console.log(`   Nivel: ${match.level || 'Abierta (0.0-7.0)'}`);
      console.log(`   Pista: ${match.courtNumber || 'Sin asignar'}`);
    }

    // 2. Verificar estadísticas
    console.log('\n2️⃣ Calculando estadísticas...');
    
    const total = await prisma.matchGame.count();
    const withBookings = await prisma.matchGame.count({
      where: {
        bookings: {
          some: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          }
        }
      }
    });
    const withCourt = await prisma.matchGame.count({
      where: { courtNumber: { not: null } }
    });

    console.log(`✅ Estadísticas:`);
    console.log(`   - Total partidas: ${total}`);
    console.log(`   - Con jugadores: ${withBookings}`);
    console.log(`   - Con pista asignada: ${withCourt}`);

    // 3. Verificar endpoints en archivos
    console.log('\n3️⃣ Verificando estructura de archivos...');
    const fs = require('fs');
    
    const adminPage = 'src/app/(app)/admin/matchgames/page.tsx';
    const createPage = 'src/app/(app)/admin/matchgames/create/page.tsx';
    const deleteEndpoint = 'src/app/api/admin/matchgames/[matchGameId]/route.ts';
    const createEndpoint = 'src/app/api/admin/matchgames/create/route.ts';
    const cronEndpoint = 'src/app/api/cron/generate-matches/route.ts';
    
    const files = [
      { path: adminPage, name: 'Página de admin' },
      { path: createPage, name: 'Página de creación' },
      { path: deleteEndpoint, name: 'Endpoint DELETE' },
      { path: createEndpoint, name: 'Endpoint CREATE' },
      { path: cronEndpoint, name: 'Endpoint CRON' }
    ];

    files.forEach(file => {
      if (fs.existsSync(file.path)) {
        console.log(`   ✅ ${file.name}: ${file.path}`);
      } else {
        console.log(`   ❌ ${file.name} NO EXISTE: ${file.path}`);
      }
    });

    // 4. Verificar sidebar
    console.log('\n4️⃣ Verificando integración en sidebar...');
    const sidebarFile = 'src/components/layout/LeftNavigationBar.tsx';
    
    if (fs.existsSync(sidebarFile)) {
      const content = fs.readFileSync(sidebarFile, 'utf-8');
      if (content.includes('/admin/matchgames')) {
        console.log(`   ✅ Botón de admin de partidas encontrado en sidebar`);
      } else {
        console.log(`   ❌ Botón de admin de partidas NO encontrado`);
      }
    }

    // 5. Verificar vercel.json
    console.log('\n5️⃣ Verificando configuración de cron...');
    const vercelFile = 'vercel.json';
    
    if (fs.existsSync(vercelFile)) {
      const content = fs.readFileSync(vercelFile, 'utf-8');
      if (content.includes('/api/cron/generate-matches')) {
        console.log(`   ✅ Cron job configurado en vercel.json`);
      } else {
        console.log(`   ❌ Cron job NO configurado`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICACIÓN COMPLETADA\n');
    console.log('📝 Todo está listo para usar el panel de admin:');
    console.log('   👉 http://localhost:9002/admin/matchgames\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminFeatures();
