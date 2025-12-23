// Test del GET de club-info
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'padelpro-secret-key-change-in-production';

// Simular el token del usuario club.admin@padelpro.com
const userId = 'cmjhk9ojc0003tgtoqq2gh42n';

const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

console.log('🔑 Token generado:', token);
console.log('\n📋 Payload del token:');
console.log(jwt.decode(token));

console.log('\n🧪 Para probar el GET, ejecuta en el navegador:');
console.log(`
fetch('http://localhost:9002/api/admin/club-info', {
  headers: {
    'Authorization': 'Bearer ${token}'
  }
})
.then(r => r.json())
.then(d => console.log('✅ Respuesta:', d))
.catch(e => console.error('❌ Error:', e));
`);

// Ahora probar directamente con fetch
console.log('\n🔄 Probando GET directamente...\n');

fetch('http://localhost:9002/api/admin/club-info', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => {
  console.log('📡 Status:', r.status);
  return r.json();
})
.then(d => {
  console.log('✅ Respuesta del servidor:');
  console.log(JSON.stringify(d, null, 2));
})
.catch(e => {
  console.error('❌ Error en la petición:', e.message);
});
