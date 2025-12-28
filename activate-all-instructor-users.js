const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function activateAllInstructorUsers() {
  try {
    console.log('🔄 Activando usuarios instructores...\n');

    // 1. Obtener todos los usuarios con rol INSTRUCTOR
    const instructorUsers = await prisma.user.findMany({
      where: {
        role: 'INSTRUCTOR'
      }
    });

    console.log(`📊 Encontrados ${instructorUsers.length} usuarios con rol INSTRUCTOR\n`);

    // 2. Verificar cuáles ya tienen registro Instructor
    const activated = [];
    const created = [];
    const errors = [];

    for (const user of instructorUsers) {
      try {
        let instructorRecord = await prisma.instructor.findFirst({
          where: { userId: user.id }
        });

        if (!instructorRecord) {
          // Crear registro Instructor
          instructorRecord = await prisma.instructor.create({
            data: {
              userId: user.id,
              name: user.name,
              clubId: 'club-1', // Club principal
              isActive: true,
              isAvailable: true,
              defaultRatePerHour: 28,
              rateTiers: JSON.stringify([
                { minPlayers: 1, ratePerHour: 28 },
                { minPlayers: 2, ratePerHour: 24 },
                { minPlayers: 3, ratePerHour: 20 },
                { minPlayers: 4, ratePerHour: 18 }
              ]),
              unavailableHours: JSON.stringify([]),
              levelRanges: JSON.stringify([
                { min: 0, max: 7, label: "Todos los niveles" }
              ])
            }
          });
          created.push({ user: user.email, id: instructorRecord.id });
          console.log(`  ✅ CREADO: ${user.email} → Instructor ID: ${instructorRecord.id}`);
        } else {
          // Actualizar para asegurar que está activo
          await prisma.instructor.update({
            where: { id: instructorRecord.id },
            data: { isActive: true, isAvailable: true }
          });
          activated.push({ user: user.email, id: instructorRecord.id });
          console.log(`  ✔️  ACTIVADO: ${user.email} (ya existía)`);
        }
      } catch (error) {
        errors.push({ user: user.email, error: error.message });
        console.error(`  ❌ ERROR con ${user.email}:`, error.message);
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESUMEN:');
    console.log(`   ✅ Registros creados: ${created.length}`);
    console.log(`   ✔️  Ya existían: ${activated.length}`);
    console.log(`   ❌ Errores: ${errors.length}`);
    console.log('═'.repeat(60) + '\n');

    // 3. Mostrar todos los instructores activos
    console.log('👨‍🏫 INSTRUCTORES ACTIVOS:\n');
    const allInstructors = await prisma.instructor.findMany({
      where: { 
        isActive: true
      },
      include: {
        user: true
      }
    });

    allInstructors.forEach((inst, idx) => {
      console.log(`${idx + 1}. ${inst.user.name}`);
      console.log(`   📧 Email: ${inst.user.email}`);
      console.log(`   🆔 User ID: ${inst.userId}`);
      console.log(`   🏷️  Instructor ID: ${inst.id}`);
      console.log('');
    });

    console.log('✅ Proceso completado exitosamente\n');

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateAllInstructorUsers();
