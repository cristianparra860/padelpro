const response = await fetch('http://localhost:9002/api/timeslots?clubId=padel-estrella-madrid&date=2025-11-29');
const data = await response.json();

console.log(`API timeslots para 29 nov: ${data.length} clases`);

// Filtrar solo 07:00-08:00
const morning = data.filter(slot => {
  const hour = new Date(slot.start).getUTCHours();
  return hour === 7;
});

console.log(`Clases de 07:00-08:00: ${morning.length}`);

if (morning.length > 0) {
  console.log('\nPrimeras 3 clases de 07:00:');
  morning.slice(0, 3).forEach(slot => {
    const date = new Date(slot.start);
    console.log(`  ${date.toISOString()} - ${slot.instructorName}`);
  });
} else {
  console.log('\n No se encontraron clases de 07:00 en el API');
}
