// test-admin-access.js
// Test de acceso de admin a endpoint protegido

const API_BASE = 'http://localhost:9002';

async function testAdminAccess() {
  console.log('🧪 Test de Acceso Admin\n');
  console.log('=' .repeat(60));

  try {
    // PASO 1: Login como admin
    console.log('\n🔐 PASO 1: Login como CLUB_ADMIN...');
    
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@padelpro.com',
        password: 'AdminPass123!'
      })
    });

    if (!loginResponse.ok) {
      console.error('❌ Error en login admin');
      const error = await loginResponse.json();
      console.error(error);
      process.exit(1);
    }

    const loginData = await loginResponse.json();
    const adminToken = loginData.token;

    console.log('✅ Admin autenticado:');
    console.log('   Nombre:', loginData.user.name);
    console.log('   Email:', loginData.user.email);
    console.log('   Role:', loginData.user.role);
    console.log('   Token:', adminToken.substring(0, 30) + '...');

    // PASO 2: Acceder a endpoint protegido
    console.log('\n🔓 PASO 2: Accediendo a /api/admin/protected-example...');
    
    const protectedResponse = await fetch(`${API_BASE}/api/admin/protected-example`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (!protectedResponse.ok) {
      console.error('❌ Error accediendo a endpoint admin');
      const error = await protectedResponse.json();
      console.error(error);
      process.exit(1);
    }

    const protectedData = await protectedResponse.json();

    console.log('✅ Acceso concedido a área admin:');
    console.log('   Message:', protectedData.message);
    console.log('   Data:', JSON.stringify(protectedData.data, null, 2));

    // RESUMEN
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETADO - Admin tiene acceso correcto');
    console.log('='.repeat(60));
    console.log('\n📊 Verificaciones:');
    console.log('   ✅ Login como CLUB_ADMIN exitoso');
    console.log('   ✅ Token JWT generado correctamente');
    console.log('   ✅ Acceso a endpoint admin permitido');
    console.log('   ✅ Datos sensibles retornados\n');

  } catch (error) {
    console.error('\n💥 Error en test:', error.message);
    process.exit(1);
  }
}

testAdminAccess();
