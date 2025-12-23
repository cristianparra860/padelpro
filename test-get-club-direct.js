const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testGetClub() {
    try {
        // Primero verificar el usuario
        const userId = 'cmjhk9ojc0003tgtoqq2gh42n';
        
        console.log('🔍 Buscando usuario:', userId);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { 
                id: true,
                name: true,
                email: true,
                role: true, 
                clubId: true 
            }
        });
        
        console.log('👤 Usuario encontrado:', user);
        
        if (!user) {
            console.error('❌ Usuario no encontrado');
            return;
        }
        
        if (!user.clubId) {
            console.error('❌ Usuario no tiene clubId asignado');
            return;
        }
        
        console.log('\n🔍 Buscando club:', user.clubId);
        
        const club = await prisma.club.findUnique({
            where: { id: user.clubId },
            select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                email: true,
                website: true,
                logo: true,
                heroImage: true,
                description: true,
                courtRentalPrice: true,
                openingHours: true,
                createdAt: true,
                updatedAt: true
            }
        });
        
        if (!club) {
            console.error('❌ Club no encontrado');
            return;
        }
        
        console.log('🏢 Club encontrado:', {
            id: club.id,
            name: club.name,
            address: club.address,
            phone: club.phone,
            email: club.email,
            website: club.website,
            hasLogo: !!club.logo,
            logoLength: club.logo?.length || 0,
            hasHeroImage: !!club.heroImage,
            heroImageLength: club.heroImage?.length || 0,
            description: club.description?.substring(0, 50),
            courtRentalPrice: club.courtRentalPrice,
            openingHours: club.openingHours?.substring(0, 50)
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

testGetClub();
