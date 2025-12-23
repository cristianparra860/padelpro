const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSavedData() {
    try {
        const club = await prisma.club.findUnique({
            where: { id: 'padel-estrella-madrid' }
        });
        
        console.log('🏢 Club:', club.name);
        console.log('📧 Email:', club.email);
        console.log('📞 Phone:', club.phone);
        console.log('🌐 Website:', club.website);
        console.log('📝 Description:', club.description);
        console.log('\n🖼️  Logo:');
        console.log('  - Tiene logo?', !!club.logo);
        console.log('  - Tamaño:', club.logo?.length || 0, 'caracteres');
        console.log('  - Preview:', club.logo?.substring(0, 80));
        console.log('\n🎨 Hero Image:');
        console.log('  - Tiene heroImage?', !!club.heroImage);
        console.log('  - Tamaño:', club.heroImage?.length || 0, 'caracteres');
        console.log('  - Preview:', club.heroImage?.substring(0, 80));
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSavedData();
