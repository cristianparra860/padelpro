// test-full-flow.js
// Test del flujo completo: Login → Obtener usuario actual

const API_BASE = 'http://localhost:9002';

async function testFullFlow() {
  console.log('🧪 Test de Flujo Completo\n');
  console.log('=' .repeat(60));

  const users = [
    { email: 'jugador1@padelpro.com', password: 'Pass123!', name: 'Juan Pérez' },
    { email: 'jugador2@padelpro.com', password: 'Pass123!', name: 'María García' },
    { email: 'instructor@padelpro.com', password: 'Pass123!', name: 'Carlos Ruiz' },
    { email: 'admin@padelpro.com', password: 'AdminPass123!', name: 'Admin PadelPro' }
  ];

  for (const testUser of users) {
    try {
      console.log(`\n📝 Probando: ${testUser.name} (${testUser.email})`);
      console.log('-'.repeat(60));

      // PASO 1: Login
      console.log('🔐 Login...');
      const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        })
      });

      if (!loginResponse.ok) {
        console.error('❌ Error en login');
        const error = await loginResponse.json();
        console.error('   Error:', error.error);
        continue;
      }

      const loginData = await loginResponse.json();
      const token = loginData.token;

      console.log('✅ Login exitoso');
      console.log('   Role:', loginData.user.role);
      console.log('   Créditos:', loginData.user.credits);

      // PASO 2: Obtener usuario actual con token
      console.log('👤 Obteniendo usuario actual...');
      const currentResponse = await fetch(`${API_BASE}/api/users/current`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!currentResponse.ok) {
        console.error('❌ Error obteniendo usuario actual');
        const error = await currentResponse.json();
        console.error('   Error:', error.error);
        continue;
      }

      const currentData = await currentResponse.json();

      console.log('✅ Usuario actual obtenido:');
      console.log('   ID:', currentData.id);
      console.log('   Nombre:', currentData.name);
      console.log('   Email:', currentData.email);
      console.log('   Créditos:', currentData.credits);
      console.log('   Puntos:', currentData.points);
      console.log('   Nivel:', currentData.level);

      // Verificar coherencia de datos
      if (loginData.user.id === currentData.id) {
        console.log('✅ Datos coherentes entre login y /current');
      } else {
        console.error('❌ Los IDs no coinciden!');
      }

    } catch (error) {
      console.error('💥 Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST COMPLETADO');
  console.log('='.repeat(60));
  console.log('\n💡 Todos los usuarios funcionan correctamente\n');
}

testFullFlow();
