// test-impersonate-alex.js - Probar impersonation con Alex García
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testImpersonation() {
  try {
    console.log('\n🧪 Probando impersonation de Alex García...\n');

    // 1. Buscar super admin
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (!superAdmin) {
      console.log('❌ No se encontró super admin');
      return;
    }

    console.log('✅ Super Admin encontrado:');
    console.log(`   ID: ${superAdmin.id}`);
    console.log(`   Name: ${superAdmin.name}`);
    console.log(`   Email: ${superAdmin.email}\n`);

    // 2. Buscar Alex García
    const alexUser = await prisma.user.findFirst({
      where: { 
        email: 'alex@example.com'
      },
      include: {
        club: true
      }
    });

    if (!alexUser) {
      console.log('❌ No se encontró Alex García');
      return;
    }

    console.log('✅ Alex García encontrado:');
    console.log(`   ID: ${alexUser.id}`);
    console.log(`   Name: ${alexUser.name}`);
    console.log(`   Email: ${alexUser.email}`);
    console.log(`   Role: ${alexUser.role}`);
    console.log(`   Club: ${alexUser.club?.name || 'Sin club'}\n`);

    // 3. Simular request a la API
    console.log('📤 Datos que se enviarían a la API:');
    const requestBody = {
      superAdminId: superAdmin.id,
      targetUserId: alexUser.id,
      reason: 'Prueba de sistema'
    };
    console.log(JSON.stringify(requestBody, null, 2));

    // 4. Intentar crear el log directamente
    console.log('\n🔨 Intentando crear ImpersonationLog...');
    
    try {
      const log = await prisma.impersonationLog.create({
        data: {
          superAdminId: superAdmin.id,
          superAdminEmail: superAdmin.email,
          targetUserId: alexUser.id,
          targetUserEmail: alexUser.email,
          targetUserRole: alexUser.role,
          ipAddress: '127.0.0.1',
          userAgent: 'test-script',
          reason: 'Prueba de sistema'
        }
      });

      console.log('✅ ImpersonationLog creado exitosamente:');
      console.log(`   Log ID: ${log.id}`);
      console.log(`   Started At: ${log.startedAt}`);
      
      // Limpiar
      await prisma.impersonationLog.delete({
        where: { id: log.id }
      });
      console.log('🧹 Log de prueba eliminado');
      
    } catch (logError) {
      console.log('❌ Error al crear ImpersonationLog:');
      console.error(logError);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testImpersonation();
