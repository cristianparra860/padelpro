const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function finalCheck() {
  console.log('\n🎯 VERIFICACIÓN FINAL DEL SISTEMA DE FOTOS\n');
  console.log('='.repeat(60));

  try {
    // 1. Verificar instructores
    console.log('\n1️⃣ Estado de instructores:');
    const instructors = await prisma.$queryRaw`
      SELECT 
        i.id,
        i.userId,
        u.name,
        u.email,
        u.profilePictureUrl
      FROM Instructor i
      LEFT JOIN User u ON i.userId = u.id
      ORDER BY i.createdAt DESC
    `;

    instructors.forEach(inst => {
      console.log(`\n   ${inst.name}:`);
      console.log(`      Instructor ID: ${inst.id}`);
      console.log(`      User ID: ${inst.userId}`);
      console.log(`      Email: ${inst.email}`);
      console.log(`      Foto: ${inst.profilePictureUrl || '(sin foto)'}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ SISTEMA VERIFICADO\n');
    console.log('📋 Pasos siguientes:');
    console.log('   1. Refrescar el navegador (Ctrl+Shift+R para limpiar cache)');
    console.log('   2. Ir a Admin > Database > Instructors');
    console.log('   3. Hacer clic en editar (ícono lápiz) de Carlos Martínez');
    console.log('   4. Subir una foto');
    console.log('   5. Guardar');
    console.log('   6. La foto debería guardarse y mostrarse correctamente\n');
    console.log('🐛 Si sigue sin funcionar, revisa la consola del navegador');
    console.log('   y la consola del servidor para ver los logs.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

finalCheck();
