console.log('🔄 PASOS PARA VER LA FOTO:\n');
console.log('1. Ve a: http://localhost:9002/profile');
console.log('2. Presiona F12 (abrir consola)');
console.log('3. En la consola, pega este código y presiona Enter:\n');
console.log('---COPIAR DESDE AQUÍ---');
console.log(`
// Limpiar y recargar
localStorage.clear();
sessionStorage.clear();
window.location.href = 'http://localhost:9002';
`);
console.log('---HASTA AQUÍ---\n');
console.log('4. Haz login de nuevo con: jugador1@padelpro.com / password123');
console.log('5. Ve a "Mis Datos" en el dashboard');
console.log('6. Deberías ver un círculo morado con "JP"\n');
