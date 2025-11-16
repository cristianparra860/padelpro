// Verificar puntos del usuario
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserPoints() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        name: 'Alex Garcia'
      },
      select: {
        id: true,
        name: true,
        email: true,
        credits: true,
        blockedCredits: true,
        points: true
      }
    });
    
    if (user) {
      console.log('👤 Usuario: Alex Garcia');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Créditos: €${(user.credits/100).toFixed(2)}`);
      console.log(`   Bloqueados: €${(user.blockedCredits/100).toFixed(2)}`);
      console.log(`   Disponibles: €${((user.credits - user.blockedCredits)/100).toFixed(2)}`);
      console.log(`   🎁 Puntos: ${user.points}`);
      
      // Ver transacciones recientes
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: user.id
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      });
      
      console.log(`\n📊 Últimas ${transactions.length} transacciones:\n`);
      transactions.forEach((tx, idx) => {
        console.log(`${idx + 1}. ${tx.type.toUpperCase()} - ${tx.action}`);
        console.log(`   Monto: €${(tx.amount/100).toFixed(2)}`);
        console.log(`   Balance: €${(tx.balance/100).toFixed(2)}`);
        console.log(`   Concepto: ${tx.concept}`);
        console.log(`   Fecha: ${new Date(tx.createdAt).toLocaleString('es-ES')}\n`);
      });
    } else {
      console.log('❌ Usuario no encontrado');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserPoints();
