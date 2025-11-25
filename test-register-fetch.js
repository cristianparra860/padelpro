const testData = {
  name: 'Marc Parra',
  email: 'marc.parra@hotmail.es',
  password: 'test123',
  level: 'avanzado',
  genderCategory: 'masculino'
};
console.log('Enviando POST a http://localhost:9002/api/register');
console.log('Datos:', JSON.stringify(testData));
fetch('http://localhost:9002/api/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testData)
}).then(r => r.json()).then(data => console.log('Respuesta:', data)).catch(err => console.error('Error:', err.message));
