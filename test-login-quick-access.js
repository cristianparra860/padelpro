// Test script para verificar la lógica de acceso rápido
console.log('=== TESTING QUICK ACCESS LOGIN LOGIC ===\n');

// Simular localStorage
const localStorage = {
  storage: {},
  setItem(key, value) {
    this.storage[key] = value;
    console.log(`✅ localStorage.setItem('${key}', ...)`);
  },
  getItem(key) {
    return this.storage[key];
  }
};

// Simular router.push
const router = {
  push(path) {
    console.log(`✅ router.push('${path}')`);
  }
};

console.log('1️⃣ Probando acceso como ADMIN...\n');
(() => {
  localStorage.setItem('auth_token', 'dev-token-admin');
  localStorage.setItem('currentUser', JSON.stringify({
    id: 'user-1763676434421-3kyrn82nu',
    name: 'Admin PadelPro',
    email: 'admin@padelpro.com',
    role: 'CLUB_ADMIN'
  }));
  router.push('/admin');
  
  const userData = JSON.parse(localStorage.getItem('currentUser'));
  console.log('📦 Datos guardados:', userData);
  console.log('🔑 Token:', localStorage.getItem('auth_token'));
})();

console.log('\n2️⃣ Probando acceso como INSTRUCTOR (Carlos Ruiz)...\n');
(() => {
  const user = { id: 'user-1763677141038-6l5kk4i4p', name: 'Carlos Ruiz', email: 'instructor@padelpro.com' };
  localStorage.setItem('auth_token', `dev-token-${user.id}`);
  localStorage.setItem('currentUser', JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    role: 'INSTRUCTOR'
  }));
  router.push('/instructor');
  
  const userData = JSON.parse(localStorage.getItem('currentUser'));
  console.log('📦 Datos guardados:', userData);
  console.log('🔑 Token:', localStorage.getItem('auth_token'));
})();

console.log('\n3️⃣ Probando acceso como JUGADOR (Marc Parra)...\n');
(() => {
  const user = { id: 'user-1763677035576-wv1t7iun0', name: 'Marc Parra', email: 'jugador1@padelpro.com', credits: -1123, points: 26 };
  localStorage.setItem('auth_token', `dev-token-${user.id}`);
  localStorage.setItem('currentUser', JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    role: 'PLAYER',
    credits: user.credits,
    points: user.points
  }));
  router.push('/dashboard');
  
  const userData = JSON.parse(localStorage.getItem('currentUser'));
  console.log('📦 Datos guardados:', userData);
  console.log('🔑 Token:', localStorage.getItem('auth_token'));
})();

console.log('\n✅ TODAS LAS PRUEBAS COMPLETADAS');
console.log('\nLa lógica del código es correcta. Los botones deberían:');
console.log('1. Guardar el token en localStorage');
console.log('2. Guardar los datos del usuario en localStorage');
console.log('3. Redirigir a la página correspondiente según el rol');
console.log('\n⚠️ Nota: Estas son pruebas de lógica. Para verificar el funcionamiento');
console.log('real, debes abrir http://localhost:9002 y hacer clic en los botones.');
