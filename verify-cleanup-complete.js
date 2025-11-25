import { prisma } from './src/lib/prisma.ts';

async function verifyCleanup() {
  try {
    console.log('🔍 VERIFICACIÓN POST-LIMPIEZA\n');
    
    // 1. Verificar que Marc Parra (jugador1) todavía existe
    const realMarc = await prisma.user.findUnique({
      where: { id: 'user-1763677035576-wv1t7iun0' }
    });
    
    console.log('👤 MARC PARRA REAL:');
    if (realMarc) {
      console.log(`   ✅ Existe: ${realMarc.email}`);
      console.log(`   Créditos: €${realMarc.credits}`);
    } else {
      console.log('   ❌ NO EXISTE - ERROR!');
    }
    
    // 2. Verificar que el duplicado NO existe
    const duplicate = await prisma.user.findUnique({
      where: { id: 'user-1763673966218-39g60gqe8' }
    });
    
    console.log('\n👤 MARC PARRA DUPLICADO:');
    if (duplicate) {
      console.log(`   ❌ AÚN EXISTE - ERROR: ${duplicate.email}`);
    } else {
      console.log('   ✅ Correctamente eliminado');
    }
    
    // 3. Verificar bookings de ambos usuarios
    const realMarcBookings = await prisma.booking.findMany({
      where: { userId: 'user-1763677035576-wv1t7iun0' }
    });
    
    const duplicateBookings = await prisma.booking.findMany({
      where: { userId: 'user-1763673966218-39g60gqe8' }
    });
    
    console.log('\n📋 BOOKINGS:');
    console.log(`   Marc real: ${realMarcBookings.length}`);
    console.log(`   Marc duplicado: ${duplicateBookings.length}`);
    
    // 4. Verificar todas las transacciones
    const allTransactions = await prisma.transaction.count();
    console.log('\n💰 TRANSACTIONS:');
    console.log(`   Total: ${allTransactions}`);
    
    // 5. Verificar instructores (crítico)
    const instructors = await prisma.instructor.findMany({
      select: {
        id: true,
        name: true,
        userId: true
      }
    });
    
    console.log('\n👨‍🏫 INSTRUCTORES (deben ser 5):');
    instructors.forEach(i => {
      console.log(`   ✅ ${i.name} (ID: ${i.id})`);
    });
    
    // 6. Verificar usuarios válidos
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log('\n👥 USUARIOS VÁLIDOS (deben ser 15):');
    users.forEach(u => {
      console.log(`   ✅ ${u.name} (${u.email}) - ${u.role}`);
    });
    
    console.log('\n✅ VERIFICACIÓN COMPLETA');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCleanup();
