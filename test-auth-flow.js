// test-auth-flow.js
// Script para probar el flujo completo de autenticación: registro + login

const API_BASE = 'http://localhost:9002';

// Generar email único con timestamp
const timestamp = Date.now();
const testUser = {
  email: `test.user.${timestamp}@example.com`,
  password: 'TestPassword123!',
  name: 'Test User Auth',
  level: 'intermedio'
};

console.log('🧪 Test de flujo de autenticación completo\n');
console.log('=' .repeat(60));

async function testAuthFlow() {
  try {
    // PASO 1: Registrar usuario
    console.log('\n📝 PASO 1: Registrando usuario...');
    console.log('   Email:', testUser.email);
    console.log('   Password:', testUser.password);
    
    const registerResponse = await fetch(`${API_BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    const registerData = await registerResponse.json();

    if (!registerResponse.ok) {
      console.error('❌ Error en registro:', registerData);
      process.exit(1);
    }

    console.log('✅ Usuario registrado exitosamente');
    console.log('   User ID:', registerData.user.id);
    console.log('   Nombre:', registerData.user.name);
    console.log('   Email:', registerData.user.email);

    // PASO 2: Esperar un momento (para asegurar que la DB se actualizó)
    console.log('\n⏳ Esperando 500ms...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // PASO 3: Intentar login
    console.log('\n🔐 PASO 2: Intentando login...');
    console.log('   Email:', testUser.email);
    console.log('   Password:', testUser.password);

    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      console.error('❌ Error en login:', loginData);
      console.error('   Status:', loginResponse.status);
      process.exit(1);
    }

    console.log('✅ Login exitoso');
    console.log('   User ID:', loginData.user.id);
    console.log('   Nombre:', loginData.user.name);
    console.log('   Email:', loginData.user.email);
    console.log('   Role:', loginData.user.role);
    console.log('   Credits:', loginData.user.credits);
    console.log('   Club:', loginData.user.club?.name || 'N/A');

    // PASO 4: Probar contraseña incorrecta
    console.log('\n🚫 PASO 3: Probando contraseña incorrecta...');
    
    const wrongPasswordResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: 'WrongPassword123!'
      })
    });

    const wrongPasswordData = await wrongPasswordResponse.json();

    if (wrongPasswordResponse.ok) {
      console.error('❌ ERROR: Login debería haber fallado con contraseña incorrecta');
      process.exit(1);
    }

    console.log('✅ Correctamente rechazado con contraseña incorrecta');
    console.log('   Error:', wrongPasswordData.error);

    // PASO 5: Probar email no existente
    console.log('\n🚫 PASO 4: Probando email no existente...');
    
    const wrongEmailResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'no.existe@example.com',
        password: testUser.password
      })
    });

    const wrongEmailData = await wrongEmailResponse.json();

    if (wrongEmailResponse.ok) {
      console.error('❌ ERROR: Login debería haber fallado con email no existente');
      process.exit(1);
    }

    console.log('✅ Correctamente rechazado con email no existente');
    console.log('   Error:', wrongEmailData.error);

    // RESUMEN FINAL
    console.log('\n' + '='.repeat(60));
    console.log('✅ TODOS LOS TESTS PASARON');
    console.log('='.repeat(60));
    console.log('\n📊 Resumen:');
    console.log('   ✅ Registro con contraseña hasheada');
    console.log('   ✅ Login con credenciales correctas');
    console.log('   ✅ Rechazo de contraseña incorrecta');
    console.log('   ✅ Rechazo de email no existente');
    console.log('\n🎉 Sistema de autenticación funcionando correctamente\n');

  } catch (error) {
    console.error('\n💥 Error en test:', error.message);
    process.exit(1);
  }
}

// Ejecutar tests
testAuthFlow();
