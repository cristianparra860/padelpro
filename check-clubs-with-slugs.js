const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClubs() {
  try {
    console.log('\n🏢 Clubes en la base de datos:\n');
    
    const clubs = await prisma.club.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    if (clubs.length === 0) {
      console.log('❌ No hay clubes en la base de datos');
      return;
    }

    clubs.forEach((club, index) => {
      console.log(`\n${index + 1}. ${club.name}`);
      console.log(`   ID: ${club.id}`);
      console.log(`   Slug sugerido: ${club.id.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`);
      console.log(`   Email: ${club.email || 'N/A'}`);
      console.log(`   Teléfono: ${club.phone || 'N/A'}`);
      console.log(`   Dirección: ${club.address || 'N/A'}`);
      console.log(`   Logo: ${club.logo || 'N/A'}`);
    });

    console.log(`\n✅ Total: ${clubs.length} clubes encontrados\n`);

    // Sugerencia de mapeo para CLUB_SLUG_MAP
    console.log('\n📝 Mapeo sugerido para CLUB_SLUG_MAP:');
    console.log('const CLUB_SLUG_MAP = {');
    clubs.forEach(club => {
      const slug = club.id.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      console.log(`  '${slug}': '${club.id}',`);
    });
    console.log('};\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClubs();
