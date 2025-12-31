// Script para verificar las partidas y sus precios
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMatchGamePrices() {
  try {
    console.log(' Verificando precios de partidas...\n');
    
    // Buscar la partida específica que reservó Alex
    const match = await prisma.matchGame.findUnique({
      where: { id: 'cmjsy0awr0007tgskxjhlbzsx' }
    });
    
    if (match) {
      console.log(' Partida encontrada:');
      console.log('  - ID:', match.id);
      console.log('  - pricePerPlayer:', match.pricePerPlayer, '€');
      console.log('  - courtRentalPrice:', match.courtRentalPrice, '€');
      console.log('  - Precio esperado por jugador:', (match.courtRentalPrice / 4).toFixed(2), '€');
      console.log('  - ¿El precio está en céntimos?', match.pricePerPlayer < 1 ? 'SÍ (ERROR)' : 'NO');
    }
    
  } catch (error) {
    console.error(' Error:', error);
  } finally {
    await prisma.();
  }
}

checkMatchGamePrices();
