// Verificar distribución de propuestas por instructor

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDistribution() {
  try {
    const proposals = await prisma.timeSlot.findMany({
      where: { courtId: null },
      include: {
        instructor: {
          include: {
            user: true
          }
        }
      },
      orderBy: { start: 'asc' }
    });

    console.log('\n📊 DISTRIBUCIÓN DE PROPUESTAS\n');
    console.log('Total propuestas:', proposals.length);
    
    if (proposals.length > 0) {
      const first = new Date(proposals[0].start);
      const last = new Date(proposals[proposals.length - 1].start);
      
      console.log('Primera propuesta:', first.toLocaleString('es-ES'));
      console.log('Última propuesta:', last.toLocaleString('es-ES'));
      console.log('');

      // Agrupar por instructor
      const byInstructor = {};
      proposals.forEach(p => {
        const name = p.instructor ? p.instructor.user.name : 'Sin instructor';
        if (!byInstructor[name]) {
          byInstructor[name] = [];
        }
        byInstructor[name].push(p);
      });

      console.log('📊 Propuestas por instructor:\n');
      for (const [name, props] of Object.entries(byInstructor)) {
        console.log(`   ${name}: ${props.length} propuestas`);
        
        // Mostrar rango de horarios
        const times = props.map(p => new Date(p.start).getHours()).sort((a, b) => a - b);
        const uniqueHours = [...new Set(times)];
        
        console.log(`   Horarios: ${uniqueHours.join('h, ')}h`);
        console.log(`   Días con clases: ${[...new Set(props.map(p => new Date(p.start).toLocaleDateString('es-ES')))].length}`);
        console.log('');
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkDistribution();
