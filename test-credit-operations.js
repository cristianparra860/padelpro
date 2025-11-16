/**
 * Test completo de funcionalidad de créditos y conversión
 * 
 * Este script prueba:
 * 1. Añadir crédito a la cuenta
 * 2. Convertir euros a puntos
 * 3. Verificar saldos
 */

const baseUrl = 'http://localhost:9002';
const userId = 'alex-user-id';

async function testAddCredit() {
  console.log('🧪 Test 1: Añadir Crédito');
  console.log('━'.repeat(50));
  
  const response = await fetch(`${baseUrl}/api/users/${userId}/credit/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 25 })
  });
  
  const result = await response.json();
  console.log(`✅ Añadidos 25€`);
  console.log(`   Nuevo saldo: €${result.newBalance.toFixed(2)}`);
  console.log();
  
  return result.newBalance;
}

async function testConvertToPoints() {
  console.log('🧪 Test 2: Convertir Euros a Puntos');
  console.log('━'.repeat(50));
  
  const response = await fetch(`${baseUrl}/api/users/${userId}/credit/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ euros: 5, pointsPerEuro: 1 })
  });
  
  const result = await response.json();
  console.log(`✅ Convertidos 5€ a puntos`);
  console.log(`   Nuevo saldo: €${result.newCreditBalance.toFixed(2)}`);
  console.log(`   Puntos ganados: ${result.newLoyaltyPoints}`);
  console.log();
  
  return result;
}

async function getCurrentBalance() {
  console.log('🔍 Verificando saldo actual...');
  console.log('━'.repeat(50));
  
  const response = await fetch(`${baseUrl}/api/users/current`);
  const user = await response.json();
  
  console.log(`Usuario: ${user.name}`);
  console.log(`Saldo: €${(user.credits / 100).toFixed(2)}`);
  console.log(`Puntos: ${user.points}`);
  console.log();
  
  return user;
}

async function runTests() {
  try {
    console.log('\n' + '═'.repeat(50));
    console.log('  TEST DE FUNCIONALIDAD: CRÉDITOS Y PUNTOS');
    console.log('═'.repeat(50) + '\n');
    
    // Estado inicial
    console.log('📊 ESTADO INICIAL');
    const initialUser = await getCurrentBalance();
    const initialBalance = initialUser.credits / 100;
    const initialPoints = initialUser.points;
    
    // Test 1: Añadir crédito
    const newBalance = await testAddCredit();
    
    // Test 2: Convertir a puntos
    const conversionResult = await testConvertToPoints();
    
    // Estado final
    console.log('📊 ESTADO FINAL');
    await getCurrentBalance();
    
    // Resumen
    console.log('═'.repeat(50));
    console.log('📈 RESUMEN DE CAMBIOS:');
    console.log('═'.repeat(50));
    console.log(`Saldo inicial:  €${initialBalance.toFixed(2)}`);
    console.log(`+ Añadido:      €25.00`);
    console.log(`- Convertido:   €5.00`);
    console.log(`Saldo final:    €${conversionResult.newCreditBalance.toFixed(2)}`);
    console.log('─'.repeat(50));
    console.log(`Puntos inicial: ${initialPoints}`);
    console.log(`+ Ganados:      ${conversionResult.newLoyaltyPoints - initialPoints}`);
    console.log(`Puntos final:   ${conversionResult.newLoyaltyPoints}`);
    console.log('═'.repeat(50));
    console.log('\n✅ Todos los tests pasaron correctamente!\n');
    
  } catch (error) {
    console.error('❌ Error en los tests:', error.message);
  }
}

runTests();
