// Simular lo que ve el usuario en el calendario
const testDate = new Date('2025-11-20T08:00:00.000Z');

console.log('Fecha en DB: 2025-11-20T08:00:00.000Z');
console.log('Hora UTC:', testDate.getUTCHours() + ':' + testDate.getUTCMinutes().toString().padStart(2, '0'));
console.log('Hora local (España GMT+1):', testDate.getHours() + ':' + testDate.getMinutes().toString().padStart(2, '0'));
console.log('');
console.log('String local:', testDate.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }));
