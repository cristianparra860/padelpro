// test-auth-jwt-flow.js
// Script para probar el flujo completo de autenticación con JWT

const API_BASE = 'http://localhost:9002';

// Generar email único con timestamp
const timestamp = Date.now();
const testUser = {
  email: `test.jwt.${timestamp}@example.com`,
  password: 'TestPassword123!',
  name: 'Test JWT User',
  level: 'avanzado'
};

let authToken = '';

console.log('🧪 Test de flujo de autenticación JWT completo\n');
console.log('=' .repeat(60));

async function testJWTAuthFlow() {
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

    // PASO 2: Esperar un momento
    console.log('\n⏳ Esperando 500ms...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // PASO 3: Login y obtener JWT
    console.log('\n🔐 PASO 2: Login y obtención de JWT...');
    
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
      process.exit(1);
    }

    authToken = loginData.token;

    console.log('✅ Login exitoso con JWT');
    console.log('   User ID:', loginData.user.id);
    console.log('   Token JWT:', authToken.substring(0, 30) + '...');
    console.log('   Token length:', authToken.length, 'caracteres');

    // PASO 4: Verificar token con endpoint /me
    console.log('\n🎫 PASO 3: Verificando token con /api/auth/me...');
    
    const meResponse = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const meData = await meResponse.json();

    if (!meResponse.ok) {
      console.error('❌ Error verificando token:', meData);
      process.exit(1);
    }

    console.log('✅ Token válido - Usuario autenticado:');
    console.log('   Nombre:', meData.user.name);
    console.log('   Email:', meData.user.email);
    console.log('   Role:', meData.user.role);

    // PASO 5: Intentar acceder sin token
    console.log('\n🚫 PASO 4: Intentando acceder sin token...');
    
    const noTokenResponse = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET'
    });

    const noTokenData = await noTokenResponse.json();

    if (noTokenResponse.ok) {
      console.error('❌ ERROR: Debería haber rechazado petición sin token');
      process.exit(1);
    }

    console.log('✅ Correctamente rechazado sin token');
    console.log('   Error:', noTokenData.error);

    // PASO 6: Intentar con token inválido
    console.log('\n🚫 PASO 5: Intentando con token inválido...');
    
    const badTokenResponse = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer token-invalido-123'
      }
    });

    const badTokenData = await badTokenResponse.json();

    if (badTokenResponse.ok) {
      console.error('❌ ERROR: Debería haber rechazado token inválido');
      process.exit(1);
    }

    console.log('✅ Correctamente rechazado con token inválido');
    console.log('   Error:', badTokenData.error);

    // PASO 7: Logout
    console.log('\n🚪 PASO 6: Cerrando sesión...');
    
    const logoutResponse = await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const logoutData = await logoutResponse.json();

    if (!logoutResponse.ok) {
      console.error('❌ Error en logout:', logoutData);
      process.exit(1);
    }

    console.log('✅ Sesión cerrada exitosamente');
    console.log('   Message:', logoutData.message);

    // RESUMEN FINAL
    console.log('\n' + '='.repeat(60));
    console.log('✅ TODOS LOS TESTS JWT PASARON');
    console.log('='.repeat(60));
    console.log('\n📊 Resumen:');
    console.log('   ✅ Registro de usuario');
    console.log('   ✅ Login con generación de JWT');
    console.log('   ✅ Validación de token válido');
    console.log('   ✅ Rechazo de peticiones sin token');
    console.log('   ✅ Rechazo de token inválido');
    console.log('   ✅ Logout exitoso');
    console.log('\n🎉 Sistema JWT funcionando correctamente\n');

    // Mostrar ejemplo de uso
    console.log('\n📘 EJEMPLO DE USO EN FRONTEND:\n');
    console.log('// Login');
    console.log('const response = await fetch("/api/auth/login", {');
    console.log('  method: "POST",');
    console.log('  headers: { "Content-Type": "application/json" },');
    console.log('  body: JSON.stringify({ email, password })');
    console.log('});');
    console.log('const { token } = await response.json();\n');
    console.log('// Guardar token');
    console.log('localStorage.setItem("auth_token", token);\n');
    console.log('// Usar en peticiones');
    console.log('fetch("/api/auth/me", {');
    console.log('  headers: { "Authorization": `Bearer ${token}` }');
    console.log('});\n');

  } catch (error) {
    console.error('\n💥 Error en test:', error.message);
    process.exit(1);
  }
}

// Ejecutar tests
testJWTAuthFlow();
