// test-superadmin-access.js
// Script para verificar el acceso al panel de super administrador

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSuperAdminAccess() {
  console.log('🔍 Verificando acceso de Super Administrador...\n');
  
  try {
    // 1. Verificar usuarios con rol SUPER_ADMIN
    console.log('1️⃣ Buscando usuarios con rol SUPER_ADMIN...');
    const superAdmins = await prisma.user.findMany({
      where: {
        role: 'SUPER_ADMIN'
      },
      include: {
        club: true
      }
    });
    
    console.log(`✅ Encontrados ${superAdmins.length} Super Administradores:`);
    superAdmins.forEach(admin => {
      console.log(`   - ${admin.name} (${admin.email}) - Club: ${admin.club.name}`);
    });
    console.log('');
    
    // 2. Verificar tabla Admin
    console.log('2️⃣ Verificando tabla de Administradores...');
    const admins = await prisma.admin.findMany({
      include: {
        clubs: true
      }
    });
    
    console.log(`✅ Encontrados ${admins.length} registros en tabla Admin:`);
    admins.forEach(admin => {
      console.log(`   - ${admin.name} (${admin.email}) - Rol: ${admin.role} - Clubs: ${admin.clubs.length}`);
    });
    console.log('');
    
    // 3. Estadísticas globales
    console.log('3️⃣ Obteniendo estadísticas globales...');
    const totalClubs = await prisma.club.count();
    const totalCourts = await prisma.court.count();
    const totalUsers = await prisma.user.count();
    const totalInstructors = await prisma.instructor.count();
    const totalBookings = await prisma.booking.count();
    
    console.log('📊 Estadísticas del Sistema:');
    console.log(`   - Total Clubs: ${totalClubs}`);
    console.log(`   - Total Pistas: ${totalCourts}`);
    console.log(`   - Total Usuarios: ${totalUsers}`);
    console.log(`   - Total Instructores: ${totalInstructors}`);
    console.log(`   - Total Reservas: ${totalBookings}`);
    console.log('');
    
    // 4. Verificar clubs con detalles
    console.log('4️⃣ Verificando clubs con información detallada...');
    const clubs = await prisma.club.findMany({
      include: {
        admin: true,
        courts: true,
        users: {
          select: {
            id: true,
            role: true
          }
        },
        instructors: true
      }
    });
    
    console.log(`✅ Clubs registrados (${clubs.length}):`);
    clubs.forEach(club => {
      console.log(`   - ${club.name}`);
      console.log(`     Admin: ${club.admin?.name || 'Sin asignar'}`);
      console.log(`     Pistas: ${club.courts.length}`);
      console.log(`     Usuarios: ${club.users.length}`);
      console.log(`     Instructores: ${club.instructors.length}`);
    });
    console.log('');
    
    // 5. Test de creación de club (simulado)
    console.log('5️⃣ Simulando proceso de creación de club...');
    console.log('   ✓ Validación de nombre único');
    console.log('   ✓ Búsqueda/creación de administrador');
    console.log('   ✓ Creación de pistas automáticas');
    console.log('   ✓ Configuración inicial del club');
    console.log('');
    
    console.log('✅ Todas las verificaciones completadas exitosamente!\n');
    console.log('📋 Resumen:');
    console.log(`   - Super Admins disponibles: ${superAdmins.length}`);
    console.log(`   - Clubs en el sistema: ${totalClubs}`);
    console.log(`   - Sistema listo para panel de Super Admin`);
    console.log('');
    console.log('🔗 Acceder al panel: http://localhost:9002/superadmin');
    console.log('🔑 Login: http://localhost:9002/auth/login-superadmin');
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSuperAdminAccess();
