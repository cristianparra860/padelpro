const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInstructorRecords() {
    try {
        console.log('\n=== VERIFICACIÓN DETALLADA DE REGISTROS INSTRUCTOR ===\n');
        
        // Obtener todos los usuarios con role INSTRUCTOR
        const instructorUsers = await prisma.user.findMany({
            where: { role: 'INSTRUCTOR' },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                assignedClubId: true
            }
        });

        console.log(`📊 Total de usuarios con role=INSTRUCTOR: ${instructorUsers.length}\n`);

        for (const user of instructorUsers) {
            console.log('─'.repeat(60));
            console.log(`📧 Email: ${user.email}`);
            console.log(`👤 Nombre: ${user.name}`);
            console.log(`🆔 User ID: ${user.id}`);
            console.log(`🏢 Club asignado: ${user.assignedClubId || 'No asignado'}`);
            
            // Buscar registro en tabla Instructor
            const instructor = await prisma.instructor.findUnique({
                where: { userId: user.id }
            });

            if (instructor) {
                console.log(`✅ Instructor record: SÍ EXISTE`);
                console.log(`   - Instructor ID: ${instructor.id}`);
                console.log(`   - Club ID: ${instructor.clubId}`);
                console.log(`   - Disponible: ${instructor.isAvailable}`);
                console.log(`   - Tarifa/hora: $${instructor.hourlyRate}`);
            } else {
                console.log(`❌ Instructor record: NO EXISTE`);
                console.log(`   ⚠️ ESTE USUARIO NO PUEDE ACCEDER AL PANEL DE INSTRUCTOR`);
                
                // Crear el registro
                console.log(`   🔧 Creando registro automáticamente...`);
                const newInstructor = await prisma.instructor.create({
                    data: {
                        userId: user.id,
                        clubId: user.assignedClubId || 'club-1',
                        isAvailable: true,
                        hourlyRate: 28,
                        levelRanges: JSON.stringify([{ min: 0, max: 7, label: 'ABIERTO' }])
                    }
                });
                console.log(`   ✅ Registro creado con ID: ${newInstructor.id}`);
            }
            console.log('');
        }

        console.log('═'.repeat(60));
        console.log('✅ Verificación completada\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkInstructorRecords();
