// Test the instructor API endpoint using fetch

async function testInstructorAPI() {
  const baseURL = 'http://localhost:9002';
  
  console.log('🧪 Testing /api/admin/instructors endpoint\n');
  
  try {
    // Test 1: Without clubId parameter (should return all)
    console.log('📍 Test 1: GET /api/admin/instructors (no clubId)');
    const response1 = await fetch(`${baseURL}/api/admin/instructors`);
    const data1 = await response1.json();
    console.log(`   ✅ Returned ${data1.length} instructors`);
    data1.forEach(inst => console.log(`      - ${inst.name || inst.instructorName} (clubId: ${inst.clubId})`));
    
    // Test 2: With clubId=padel-estrella-madrid
    console.log('\n📍 Test 2: GET /api/admin/instructors?clubId=padel-estrella-madrid');
    const response2 = await fetch(`${baseURL}/api/admin/instructors?clubId=padel-estrella-madrid`);
    const data2 = await response2.json();
    console.log(`   ✅ Returned ${data2.length} instructors`);
    data2.forEach(inst => console.log(`      - ${inst.name || inst.instructorName} (clubId: ${inst.clubId})`));
    
    // Test 3: With non-existent clubId
    console.log('\n📍 Test 3: GET /api/admin/instructors?clubId=club-fake-xyz');
    const response3 = await fetch(`${baseURL}/api/admin/instructors?clubId=club-fake-xyz`);
    const data3 = await response3.json();
    console.log(`   ✅ Returned ${data3.length} instructors`);
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   - Without clubId: ${data1.length} instructors`);
    console.log(`   - With padel-estrella-madrid: ${data2.length} instructors`);
    console.log(`   - With fake club: ${data3.length} instructors`);
    
    if (data1.length === data2.length) {
      console.log('\n✅ Both queries return same count - all instructors in same club');
    } else {
      console.log('\n⚠️ Different counts - instructors distributed across clubs');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testInstructorAPI();
