const fetch = require('node-fetch');

async function testInstructorsDialog() {
  console.log('🧪 Testing Instructors Dialog Data Flow\n');
  
  try {
    // Simular lo que hace el componente
    const timestamp = Date.now();
    const url = `http://localhost:9002/api/instructors?_t=${timestamp}`;
    
    console.log('📡 Fetching:', url);
    
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const fetched = await response.json();
      console.log('\n✅ Instructors loaded from API:', fetched.length);
      console.log('📋 Nombres de instructores:', fetched.map(i => i.name).join(', '));
      
      console.log('\n📝 Detalles completos:');
      fetched.forEach((inst, idx) => {
        console.log(`  ${idx + 1}. ${inst.name}`);
        console.log(`     - ID: ${inst.id}`);
        console.log(`     - Club: ${inst.clubId}`);
        console.log(`     - Email: ${inst.email || 'N/A'}`);
      });
      
      // Simular selección por defecto
      const allIds = fetched.map(inst => inst.id);
      console.log('\n🔄 IDs que se seleccionarían por defecto:');
      allIds.forEach(id => console.log(`   - ${id}`));
      
      console.log('\n✅ Total instructores que deberían aparecer en el diálogo:', fetched.length);
      
    } else {
      console.error('❌ API failed with status:', response.status);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testInstructorsDialog();
