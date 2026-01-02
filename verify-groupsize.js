const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function verifyGroupSize() {
  console.log("🔍 Verificando groupSize en bookings...\n");

  try {
    // 1. Contar bookings por groupSize
    const group1 = await prisma.matchGameBooking.count({
      where: { groupSize: 1 },
    });
    const group4 = await prisma.matchGameBooking.count({
      where: { groupSize: 4 },
    });

    console.log(`📊 Bookings con groupSize = 1: ${group1}`);
    console.log(`📊 Bookings con groupSize = 4: ${group4}\n`);

    // 2. Verificar un matchGame específico del 2026-01-01 con reserva privada
    const privateMatches = await prisma.matchGame.findMany({
      where: {
        start: {
          gte: new Date("2026-01-01T00:00:00.000Z"),
          lte: new Date("2026-01-01T23:59:59.999Z"),
        },
      },
      include: {
        bookings: {
          where: { status: { not: "CANCELLED" } },
          select: {
            id: true,
            userId: true,
            groupSize: true,
            amountBlocked: true,
            status: true,
            user: { select: { name: true } },
          },
        },
      },
      take: 5,
    });

    console.log(
      `🎾 Mostrando ${privateMatches.length} partidas del 2026-01-01:\n`
    );

    privateMatches.forEach((match, index) => {
      const activeBookings = match.bookings.filter(
        (b) => b.status !== "CANCELLED"
      );
      const totalSlots = activeBookings.reduce(
        (sum, b) => sum + b.groupSize,
        0
      );

      console.log(`${index + 1}. ${match.start.toLocaleString()}`);
      console.log(`   - Total slots ocupados: ${totalSlots}/4`);
      console.log(`   - Bookings activos: ${activeBookings.length}`);

      activeBookings.forEach((b) => {
        console.log(
          `     * ${b.user.name} - groupSize: ${b.groupSize}, amount: ${b.amountBlocked}, status: ${b.status}`
        );
      });
      console.log("");
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyGroupSize();
