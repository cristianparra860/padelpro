const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function forceCreateInstructors() {
    try {
        // Buscar todos los usuarios con role='INSTRUCTOR'
        const instructorUsers = await prisma.user.findMany({
            where: { role: 'INSTRUCTOR' }
        });

        console.log(`\n🔍 Encontrados ${instructorUsers.length} usuarios con role=INSTRUCTOR\n`);

        for (const user of instructorUsers) {
            console.log(`📧 Procesando: ${user.email} (${user.name})`);
            
            // Verificar si ya tiene registro de Instructor
            const existing = await prisma.instructor.findUnique({
                where: { userId: user.id }
            });

            if (existing) {
                console.log(`   ✅ Ya tiene registro Instructor (ID: ${existing.id})`);
            } else {
                console.log(`   ⚠️ NO tiene registro - Creando...`);
                
                const newInstructor = await prisma.instructor.create({
                    data: {
                        userId: user.id,
                        clubId: user.assignedClubId || 'club-1',
                        isAvailable: true,
                        hourlyRate: 28,
                        levelRanges: JSON.stringify([{ min: 0, max: 7, label: 'ABIERTO' }]),
                        rateTiers: JSON.stringify([]),
                        unavailableHours: JSON.stringify({})
                    }
                });
                
                console.log(`   ✅ Creado con éxito (ID: ${newInstructor.id})`);
            }
        }

        console.log(`\n✅ Proceso completado\n`);
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

forceCreateInstructors();
