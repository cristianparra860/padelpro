const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Logo por defecto de Padel Estrella Madrid
const DEFAULT_LOGO = 'https://api.dicebear.com/7.x/shapes/svg?seed=padel';

async function addDefaultLogos() {
    console.log('🔧 Agregando logos por defecto a los clubs...\n');
    
    const clubs = await prisma.club.findMany();
    
    for (const club of clubs) {
        // Asignar logo por defecto si está null
        if (!club.logo) {
            await prisma.club.update({
                where: { id: club.id },
                data: {
                    logo: DEFAULT_LOGO
                }
            });
            console.log(`✅ Logo agregado a "${club.name}"`);
        } else {
            console.log(`⏭️  "${club.name}" ya tiene logo`);
        }
    }
    
    console.log('\n✅ Proceso completado');
    await prisma.$disconnect();
}

addDefaultLogos().catch(console.error);
