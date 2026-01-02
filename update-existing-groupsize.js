const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function updateExistingGroupSize() {
  console.log("🔄 Actualizando groupSize en bookings existentes...\n");

  try {
    // 1. Actualizar bookings privados (amountBlocked > 1000) con groupSize = 4
    const privateBookings = await prisma.matchGameBooking.updateMany({
      where: {
        amountBlocked: { gt: 1000 },
        groupSize: 1, // Solo los que tienen el default
      },
      data: {
        groupSize: 4,
      },
    });

    console.log(`✅ Bookings privados actualizados: ${privateBookings.count}`);

    // 2. Verificar que los bookings individuales ya tienen groupSize = 1 (por default)
    const individualBookings = await prisma.matchGameBooking.count({
      where: {
        amountBlocked: { lte: 1000 },
        groupSize: 1,
      },
    });

    console.log(
      `✅ Bookings individuales con groupSize = 1: ${individualBookings}`
    );

    // 3. Verificar resultados
    const privateCount = await prisma.matchGameBooking.count({
      where: {
        amountBlocked: { gt: 1000 },
        groupSize: 4,
      },
    });

    console.log(
      `\n📊 Total bookings privados (groupSize=4): ${privateCount}`
    );

    // 4. Mostrar ejemplo de booking privado
    const examplePrivate = await prisma.matchGameBooking.findFirst({
      where: {
        amountBlocked: { gt: 1000 },
        groupSize: 4,
      },
      include: {
        user: { select: { name: true, email: true } },
        matchGame: { select: { start: true } },
      },
    });

    if (examplePrivate) {
      console.log("\n🎾 Ejemplo de booking privado:");
      console.log(`- Usuario: ${examplePrivate.user.name}`);
      console.log(`- Fecha: ${examplePrivate.matchGame.start}`);
      console.log(`- AmountBlocked: ${examplePrivate.amountBlocked}`);
      console.log(`- GroupSize: ${examplePrivate.groupSize}`);
    }

    console.log("\n✅ Actualización completada exitosamente");
  } catch (error) {
    console.error("❌ Error actualizando groupSize:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateExistingGroupSize();
