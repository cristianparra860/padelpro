const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check9amBookings() {
  console.log("🔍 Verificando reservas de las 9:00 del 4 de enero...\n");

  try {
    const matches = await prisma.matchGame.findMany({
      where: {
        start: {
          gte: new Date("2026-01-04T08:00:00.000Z"),
          lte: new Date("2026-01-04T09:00:00.000Z"),
        },
      },
      include: {
        bookings: {
          where: {
            status: { not: "CANCELLED" },
          },
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    });

    console.log(`📊 Encontradas ${matches.length} partidas a las 9:00\n`);

    matches.forEach((match, idx) => {
      console.log(`${idx + 1}. Partida ${match.id}`);
      console.log(`   - Hora: ${match.start.toLocaleString()}`);
      console.log(`   - Pista: ${match.courtNumber || "Sin asignar"}`);
      console.log(`   - Bookings activos: ${match.bookings.length}`);

      match.bookings.forEach((b, i) => {
        console.log(`\n   Booking ${i + 1}:`);
        console.log(`     * ID: ${b.id}`);
        console.log(`     * Usuario: ${b.user?.name || "Sin nombre"}`);
        console.log(`     * Status: ${b.status}`);
        console.log(`     * GroupSize: ${b.groupSize}`);
        console.log(`     * AmountBlocked: ${b.amountBlocked}`);
        console.log(`     * IsRecycled: ${b.isRecycled}`);
      });

      // Calcular total de slots
      const totalSlots = match.bookings.reduce(
        (sum, b) => sum + (b.groupSize || 1),
        0
      );
      console.log(`\n   ✅ Total slots ocupados: ${totalSlots}/4\n`);
      console.log("   " + "=".repeat(50) + "\n");
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

check9amBookings();
