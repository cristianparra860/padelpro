console.log(' Regenerando día 19 de noviembre...\n');

const response = await fetch('http://localhost:9002/api/cron/generate-cards?targetDay=0');
const result = await response.json();

console.log('Resultado:');
console.log(JSON.stringify(result, null, 2));

if (result.created) {
  console.log(`\n Creadas ${result.created} clases para el día 19`);
} else {
  console.log('\n No se crearon clases. Detalles:', result);
}
