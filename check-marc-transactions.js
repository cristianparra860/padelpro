const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMarcParra() {
  try {
    console.log('=== CHECKING MARC PARRA\'S ACCOUNT ===\n');
    
    const marc = await prisma.user.findUnique({
      where: { email: 'jugador1@padelpro.com' },
      select: {
        id: true,
        name: true,
        credits: true,
        blockedCredits: true,
        points: true,
        blockedPoints: true
      }
    });
    
    if (!marc) {
      console.log('❌ Marc Parra no encontrado');
      return;
    }
    
    console.log('👤 Marc Parra (jugador1@padelpro.com)');
    console.log(`   Total Credits: ${marc.credits}€`);
    console.log(`   Blocked Credits: ${marc.blockedCredits}€`);
    console.log(`   Available Credits: ${marc.credits - (marc.blockedCredits || 0)}€`);
    console.log(`   Total Points: ${marc.points} pts`);
    console.log(`   Blocked Points: ${marc.blockedPoints || 0} pts`);
    console.log(`   Available Points: ${marc.points - (marc.blockedPoints || 0)} pts\n`);
    
    // Obtener todas las transacciones
    const transactions = await prisma.transaction.findMany({
      where: { userId: marc.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        type: true,
        action: true,
        amount: true,
        balance: true,
        concept: true,
        createdAt: true
      }
    });
    
    console.log(`📋 Total Transactions: ${transactions.length}\n`);
    
    // Simular el cálculo del balance
    let simulatedCredits = 0;
    let simulatedPoints = 0;
    
    console.log('🔄 SIMULATING BALANCE CHANGES:\n');
    
    transactions.forEach((tx, idx) => {
      const isCredit = tx.type === 'credit';
      const isAdd = tx.action === 'add' || tx.action === 'refund';
      const isSubtract = tx.action === 'subtract';
      
      let balanceChange = 0;
      
      if (isCredit) {
        if (isAdd) {
          simulatedCredits += tx.amount;
          balanceChange = tx.amount;
        } else if (isSubtract) {
          simulatedCredits -= tx.amount;
          balanceChange = -tx.amount;
        }
      } else {
        if (isAdd) {
          simulatedPoints += tx.amount;
          balanceChange = tx.amount;
        } else if (isSubtract) {
          simulatedPoints -= tx.amount;
          balanceChange = -tx.amount;
        }
      }
      
      const date = new Date(tx.createdAt);
      const typeSymbol = isCredit ? '💶' : '💎';
      const changeSymbol = balanceChange > 0 ? '+' : '';
      
      console.log(`${idx + 1}. ${typeSymbol} ${tx.action.toUpperCase()} ${changeSymbol}${balanceChange}${isCredit ? '€' : ' pts'}`);
      console.log(`   Concept: ${tx.concept}`);
      console.log(`   Balance in DB: ${tx.balance}${isCredit ? '€' : ' pts'}`);
      console.log(`   Simulated Balance: ${isCredit ? simulatedCredits + '€' : simulatedPoints + ' pts'}`);
      console.log(`   Date: ${date.toLocaleString('es-ES')}`);
      console.log('');
    });
    
    console.log('📊 FINAL COMPARISON:\n');
    console.log(`   Simulated Credits: ${simulatedCredits}€`);
    console.log(`   Actual Credits: ${marc.credits}€`);
    console.log(`   Match: ${simulatedCredits === marc.credits ? '✅' : '❌'}\n`);
    
    console.log(`   Simulated Points: ${simulatedPoints} pts`);
    console.log(`   Actual Points: ${marc.points} pts`);
    console.log(`   Match: ${simulatedPoints === marc.points ? '✅' : '❌'}\n`);
    
    // Verificar última transacción
    if (transactions.length > 0) {
      const lastTx = transactions[transactions.length - 1];
      console.log('🔍 LAST TRANSACTION CHECK:\n');
      
      console.log(`   Last Transaction Type: ${lastTx.type}`);
      console.log(`   Last Transaction Balance: ${lastTx.balance}${lastTx.type === 'credit' ? '€' : ' pts'}`);
      
      if (lastTx.type === 'credit') {
        console.log(`   Current User Credits: ${marc.credits}€`);
        console.log(`   Should Match: ${lastTx.balance === marc.credits ? '✅' : '❌'}`);
      } else {
        console.log(`   Current User Points: ${marc.points} pts`);
        console.log(`   Should Match: ${lastTx.balance === marc.points ? '✅' : '❌'}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMarcParra();
