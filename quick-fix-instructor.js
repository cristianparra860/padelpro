const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickFix() {
    try {
        // Usuario específico que está intentando acceder
        const user = await prisma.user.findFirst({
            where: { email: 'alex.garcia@padelpro.com' }
        });

        if (!user) {
            console.log('❌ Usuario no encontrado');
            return;
        }

        console.log('✅ Usuario encontrado:', user.email);
        console.log('   Role:', user.role);
        console.log('   ID:', user.id);

        // Buscar registro en Instructor
        let instructor = await prisma.instructor.findUnique({
            where: { userId: user.id }
        });

        if (instructor) {
            console.log('✅ Ya tiene registro Instructor (ID:', instructor.id, ')');
        } else {
            console.log('⚠️  NO tiene registro - Creando...');
            instructor = await prisma.instructor.create({
                data: {
                    userId: user.id,
                    name: user.name,
                    clubId: user.assignedClubId || 'club-1',
                    isAvailable: true,
                    hourlyRate: 28,
                    levelRanges: JSON.stringify([{ min: 0, max: 7, label: 'ABIERTO' }]),
                    rateTiers: JSON.stringify([]),
                    unavailableHours: JSON.stringify({})
                }
            });
            console.log('✅ Registro creado con ID:', instructor.id);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

quickFix();
