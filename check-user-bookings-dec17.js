async function checkUserBookings() {
  const userId = 'cmhkwi8so0001tggo0bwojrjy';
  const url = `http://localhost:9002/api/users/${userId}/bookings`;
  
  const response = await fetch(url);
  const bookings = await response.json();
  
  console.log(`Total bookings: ${bookings.length}`);
  
  // Filtrar los del 17 de diciembre
  const dec17 = bookings.filter(b => {
    const start = b.timeSlot?.start || b.start;
    return start && start.includes('2025-12-17');
  });
  
  console.log(`Dec 17 bookings: ${dec17.length}`);
  
  if (dec17.length > 0) {
    dec17.forEach(b => {
      console.log(`  ID: ${b.id.substring(0, 20)}...`);
      console.log(`  Start: ${b.timeSlot?.start || b.start}`);
      console.log(`  Status: ${b.status}`);
      console.log('');
    });
  }
}

checkUserBookings();
