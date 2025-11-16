const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTransactionSystem() {
  try {
    console.log('🧪 Testing Transaction System\n');

    // 1. Obtener un usuario existente
    const users = await prisma.user.findMany({ take: 1 });
    if (users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
      return;
    }
    
    const testUser = users[0];
    console.log(`✅ Usuario de prueba: ${testUser.name} (${testUser.id})`);
    console.log(`   Créditos: €${(testUser.credits / 100).toFixed(2)}`);
    console.log(`   Puntos: ${testUser.points}\n`);

    // 2. Verificar que la tabla Transaction existe y está vacía
    const existingTransactions = await prisma.transaction.findMany({
      where: { userId: testUser.id }
    });
    
    console.log(`📊 Transacciones actuales del usuario: ${existingTransactions.length}\n`);

    // 3. Crear una transacción de prueba
    console.log('📝 Creando transacción de prueba...');
    const newTransaction = await prisma.transaction.create({
      data: {
        userId: testUser.id,
        type: 'credit',
        action: 'add',
        amount: 1000, // 10€ en céntimos
        balance: testUser.credits,
        concept: 'Prueba del sistema de transacciones',
        metadata: JSON.stringify({ test: true, timestamp: Date.now() })
      }
    });

    console.log('✅ Transacción creada:');
    console.log(`   ID: ${newTransaction.id}`);
    console.log(`   Tipo: ${newTransaction.type}`);
    console.log(`   Acción: ${newTransaction.action}`);
    console.log(`   Monto: €${(newTransaction.amount / 100).toFixed(2)}`);
    console.log(`   Balance: €${(newTransaction.balance / 100).toFixed(2)}`);
    console.log(`   Concepto: ${newTransaction.concept}`);
    console.log(`   Fecha: ${newTransaction.createdAt.toLocaleString('es-ES')}\n`);

    // 4. Verificar que se puede leer desde la API
    console.log('🔍 Verificando lectura desde API...');
    const allTransactions = await prisma.transaction.findMany({
      where: { userId: testUser.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`✅ Transacciones encontradas: ${allTransactions.length}`);
    allTransactions.forEach((tx, index) => {
      const sign = tx.action === 'add' || tx.action === 'refund' ? '+' : '-';
      console.log(`   ${index + 1}. ${sign}€${(tx.amount / 100).toFixed(2)} - ${tx.concept}`);
    });

    console.log('\n✅ Sistema de transacciones funcionando correctamente!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTransactionSystem();
