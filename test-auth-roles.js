// test-auth-roles.js
// Test de autenticación con validación de roles

const API_BASE = 'http://localhost:9002';

console.log('🧪 Test de Sistema de Roles JWT\n');
console.log('=' .repeat(60));

async function testRoleSystem() {
  try {
    // PASO 1: Crear usuario regular (PLAYER)
    console.log('\n👤 PASO 1: Creando usuario PLAYER...');
    
    const playerEmail = `player.${Date.now()}@example.com`;
    const registerPlayer = await fetch(`${API_BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: playerEmail,
        password: 'Player123!',
        name: 'Test Player',
        level: 'intermedio'
      })
    });

    if (!registerPlayer.ok) {
      console.error('❌ Error registrando player');
      process.exit(1);
    }

    console.log('✅ Usuario PLAYER creado:', playerEmail);

    // PASO 2: Login como PLAYER
    console.log('\n🔐 PASO 2: Login como PLAYER...');
    
    const loginPlayer = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: playerEmail,
        password: 'Player123!'
      })
    });

    const playerData = await loginPlayer.json();
    const playerToken = playerData.token;

    console.log('✅ Login exitoso');
    console.log('   Role:', playerData.user.role);
    console.log('   Token:', playerToken.substring(0, 30) + '...');

    // PASO 3: Verificar acceso a /api/auth/me
    console.log('\n✅ PASO 3: PLAYER accediendo a /api/auth/me...');
    
    const mePlayer = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${playerToken}` }
    });

    if (!mePlayer.ok) {
      console.error('❌ Error: PLAYER debería poder acceder a /me');
      process.exit(1);
    }

    console.log('✅ PLAYER puede acceder a /api/auth/me');

    // PASO 4: Intentar acceder a endpoint de admin
    console.log('\n🚫 PASO 4: PLAYER intentando acceder a endpoint admin...');
    
    const adminAccess = await fetch(`${API_BASE}/api/admin/protected-example`, {
      headers: { 'Authorization': `Bearer ${playerToken}` }
    });

    if (adminAccess.ok) {
      console.error('❌ ERROR: PLAYER NO debería acceder a endpoint admin');
      process.exit(1);
    }

    const adminAccessData = await adminAccess.json();
    console.log('✅ Acceso correctamente denegado');
    console.log('   Status:', adminAccess.status);
    console.log('   Error:', adminAccessData.error);

    // PASO 5: Verificar endpoint protegido /api/users/me
    console.log('\n✅ PASO 5: PLAYER accediendo a /api/users/me...');
    
    const userMe = await fetch(`${API_BASE}/api/users/me`, {
      headers: { 'Authorization': `Bearer ${playerToken}` }
    });

    if (!userMe.ok) {
      console.error('❌ Error: Usuario autenticado debería acceder a /users/me');
      process.exit(1);
    }

    const userMeData = await userMe.json();
    console.log('✅ Datos de usuario obtenidos:');
    console.log('   Nombre:', userMeData.name);
    console.log('   Email:', userMeData.email);
    console.log('   Créditos:', userMeData.credits);
    console.log('   Puntos:', userMeData.points);

    // RESUMEN
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST DE ROLES COMPLETADO');
    console.log('='.repeat(60));
    console.log('\n📊 Verificaciones:');
    console.log('   ✅ Usuario PLAYER creado y autenticado');
    console.log('   ✅ PLAYER puede acceder a endpoints públicos');
    console.log('   ✅ PLAYER bloqueado en endpoints admin');
    console.log('   ✅ Sistema de roles funcionando correctamente');
    
    console.log('\n💡 NOTAS:');
    console.log('   • Para crear admin, editar directamente en BD:');
    console.log('     UPDATE User SET role = "CLUB_ADMIN" WHERE email = "..."');
    console.log('   • Roles disponibles: PLAYER, INSTRUCTOR, CLUB_ADMIN, SUPER_ADMIN');
    console.log('   • Usar requireRole() en endpoints para validar permisos\n');

  } catch (error) {
    console.error('\n💥 Error en test:', error.message);
    process.exit(1);
  }
}

testRoleSystem();
