// check-impersonation-table.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTable() {
  try {
    console.log('\n🔍 Verificando tabla ImpersonationLog...\n');

    // Intentar contar registros
    const count = await prisma.impersonationLog.count();
    console.log('✅ Tabla ImpersonationLog existe');
    console.log(`   Registros actuales: ${count}\n`);

    // Intentar obtener el schema
    const logs = await prisma.impersonationLog.findMany({
      take: 5
    });

    if (logs.length > 0) {
      console.log('📋 Últimos registros:');
      logs.forEach(log => {
        console.log(`   - ${log.superAdminEmail} -> ${log.targetUserEmail}`);
        console.log(`     Razón: ${log.reason}`);
        console.log(`     Iniciado: ${log.startedAt}`);
        console.log('');
      });
    } else {
      console.log('ℹ️  No hay registros en la tabla todavía');
    }

  } catch (error) {
    console.error('❌ Error al verificar tabla:', error.message);
    console.error('\n📝 Detalles del error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTable();
