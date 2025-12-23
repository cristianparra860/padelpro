const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUpdate() {
    try {
        console.log('🔄 Probando actualización del club...');
        
        const clubId = 'padel-estrella-madrid';
        
        const updated = await prisma.club.update({
            where: { id: clubId },
            data: {
                phone: '+34 666 666 666',
                email: 'test@test.com',
                website: 'https://test.com',
                description: 'Test description'
            }
        });
        
        console.log('✅ Actualización exitosa:', {
            id: updated.id,
            name: updated.name,
            phone: updated.phone,
            email: updated.email
        });
    } catch (error) {
        console.error('❌ Error en actualización:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

testUpdate();
