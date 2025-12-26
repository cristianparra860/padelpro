const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPrices() {
  const matches = await prisma.matchGame.findMany({
    take: 5,
    select: {
      id: true,
      pricePerPlayer: true,
      courtRentalPrice: true,
      start: true,
      isOpen: true,
      level: true
    }
  });
  
  console.log('📊 Partidas en BD:\n');
  matches.forEach((m, i) => {
    console.log(`${i + 1}. ${m.id}`);
    console.log(`   Precio por jugador: ${m.pricePerPlayer === null || m.pricePerPlayer === 0 ? 'NULL/0 ❌' : m.pricePerPlayer + ' créditos ✅'}`);
    console.log(`   Precio total pista: ${m.courtRentalPrice === null || m.courtRentalPrice === 0 ? 'NULL/0 ❌' : m.courtRentalPrice + ' créditos ✅'}`);
    console.log(`   Fecha: ${new Date(m.start).toLocaleString()}`);
    console.log(`   Nivel: ${m.level || 'Sin nivel'}`);
    console.log(`   Tipo: ${m.isOpen ? 'Abierta' : 'Clasificada'}\n`);
  });
  
  await prisma.$disconnect();
}

checkPrices();
