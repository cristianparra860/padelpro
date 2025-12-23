const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClubData() {
    try {
        const club = await prisma.club.findUnique({
            where: { id: 'padel-estrella-madrid' },
            select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                email: true,
                website: true,
                logo: true,
                heroImage: true,
                description: true
            }
        });
        
        if (!club) {
            console.error('❌ Club no encontrado');
            return;
        }
        
        console.log('🏢 Datos del club en la base de datos:');
        console.log({
            id: club.id,
            name: club.name,
            address: club.address,
            phone: club.phone,
            email: club.email,
            website: club.website,
            description: club.description,
            hasLogo: !!club.logo,
            logoLength: club.logo?.length || 0,
            logoPreview: club.logo?.substring(0, 100),
            hasHeroImage: !!club.heroImage,
            heroImageLength: club.heroImage?.length || 0,
            heroImagePreview: club.heroImage?.substring(0, 100)
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkClubData();
