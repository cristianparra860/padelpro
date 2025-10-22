/**
 * Script para probar el endpoint /api/timeslots
 */

async function testTimeslotsAPI() {
  const baseUrl = 'http://localhost:9002';
  const date = '2025-10-20';
  
  console.log('🧪 Testing /api/timeslots endpoint');
  console.log('📅 Date:', date);
  console.log('');

  try {
    const url = `${baseUrl}/api/timeslots?date=${date}`;
    console.log('🔗 URL:', url);
    
    const response = await fetch(url);
    console.log('📊 Status:', response.status);
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Error response:', text);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Response received');
    console.log('📦 Total timeslots:', data.length);
    console.log('');
    
    if (data.length > 0) {
      console.log('🔍 First 3 timeslots:');
      data.slice(0, 3).forEach((slot: any, index: number) => {
        console.log(`\n${index + 1}. TimeSlot ${slot.id}`);
        console.log('   Start:', slot.start);
        console.log('   Duration:', slot.duration);
        console.log('   Instructor:', slot.instructor?.name || 'N/A');
        console.log('   CourtId:', slot.courtId);
        console.log('   CourtNumber:', slot.courtNumber);
      });
    } else {
      console.log('⚠️  No timeslots returned!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testTimeslotsAPI();
