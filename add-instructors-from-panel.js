const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addInstructors() {
  try {
    // Primero obtenemos o creamos el club "Padel Estrella Madrid"
    let club = await prisma.club.findFirst({
      where: {
        OR: [
          { name: { contains: 'Padel Estrella Madrid' } },
          { id: 'padel-estrella-madrid' }
        ]
      }
    });

    if (!club) {
      console.log('📝 Creando club Padel Estrella Madrid...');
      club = await prisma.club.create({
        data: {
          id: 'padel-estrella-madrid',
          name: 'Padel Estrella Madrid',
          description: 'Club de padel en Madrid con instructores profesionales',
          address: 'Madrid, España',
          email: 'info@padelestrella.com',
          phone: '+34 912345678'
        }
      });
      console.log(`✅ Club creado: ${club.name} (ID: ${club.id})`);
    } else {
      console.log(`✅ Club encontrado: ${club.name} (ID: ${club.id})`);
    }

    // Datos de los instructores de la imagen
    const instructorsData = [
      {
        name: 'Ana González',
        email: 'david.collado@padelpro.com',
        specialties: 'Padel General',
        experience: 'Sin especificar',
        hourlyRate: 30.00
      },
      {
        name: 'Carlos Rodriguez',
        email: 'carlos@padelclub.com',
        specialties: 'Técnica avanzada',
        experience: 'Sin especificar',
        hourlyRate: 30.00
      },
      {
        name: 'Diego Martinez',
        email: 'alex.garcia@padelpro.com',
        specialties: 'Padel General',
        experience: 'Sin especificar',
        hourlyRate: 30.00
      },
      {
        name: 'Instructor 5',
        email: 'cristian.parra@padelpro.com',
        specialties: 'Padel General',
        experience: 'Sin especificar',
        hourlyRate: 30.00
      },
      {
        name: 'Instructor 6',
        email: 'instructor@padelpro.com',
        specialties: 'Clases generales de pádel',
        experience: '5 años de experiencia',
        hourlyRate: 30.00
      },
      {
        name: 'Maria Fernández',
        email: 'ana@padelclub.com',
        specialties: 'Principiantes',
        experience: 'Sin especificar',
        hourlyRate: 30.00
      }
    ];

    console.log('\n🔄 Creando instructores...\n');

    for (const instructorData of instructorsData) {
      try {
        // Verificar si el usuario ya existe
        let user = await prisma.user.findUnique({
          where: { email: instructorData.email }
        });

        // Si no existe el usuario, crearlo
        if (!user) {
          user = await prisma.user.create({
            data: {
              email: instructorData.email,
              name: instructorData.name,
              role: 'INSTRUCTOR',
              gender: 'masculino', // Por defecto, se puede ajustar si es necesario
              club: {
                connect: { id: club.id }
              }
            }
          });
          console.log(`  ✅ Usuario creado: ${user.name} (${user.email})`);
        } else {
          console.log(`  ℹ️  Usuario ya existe: ${user.name} (${user.email})`);
        }

        // Verificar si el instructor ya está registrado
        const existingInstructor = await prisma.instructor.findUnique({
          where: { userId: user.id }
        });

        if (existingInstructor) {
          console.log(`  ⚠️  Instructor ya registrado: ${instructorData.name}`);
          continue;
        }

        // Crear el instructor
        const instructor = await prisma.instructor.create({
          data: {
            userId: user.id,
            name: instructorData.name,
            specialties: instructorData.specialties,
            experience: instructorData.experience,
            hourlyRate: instructorData.hourlyRate,
            defaultRatePerHour: instructorData.hourlyRate,
            clubId: club.id,
            isActive: true,
            isAvailable: true
          }
        });

        console.log(`  ✅ Instructor creado: ${instructor.name} - €${instructor.hourlyRate}/hora`);
      } catch (error) {
        console.error(`  ❌ Error al crear instructor ${instructorData.name}:`, error.message);
      }
    }

    // Mostrar resumen
    console.log('\n📊 Resumen final:\n');
    const totalInstructors = await prisma.instructor.count({
      where: { clubId: club.id }
    });
    console.log(`Total de instructores en ${club.name}: ${totalInstructors}`);

    const allInstructors = await prisma.instructor.findMany({
      where: { clubId: club.id },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    console.log('\n📋 Lista de instructores:');
    allInstructors.forEach((inst, idx) => {
      console.log(`${idx + 1}. ${inst.name} - ${inst.specialties || 'Sin especialidad'} - €${inst.hourlyRate}/hora - ${inst.user.email}`);
    });

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addInstructors();
