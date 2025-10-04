import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanup() {
  try {
    console.log("🧹 Cleaning MongoDB collections...");

    // 🗑️ Видаляємо зайві/великі колекції
    await prisma.feed.deleteMany();
    console.log("✅ Feed collection cleared");

    await prisma.analytics.deleteMany();
    console.log("✅ Analytics collection cleared");

    await prisma.impression.deleteMany();
    console.log("✅ Impression collection cleared");

    await prisma.impressionCounter.deleteMany();
    console.log("✅ ImpressionCounter collection cleared");

    // ❗ Можеш додати сюди інші колекції, якщо вони теж великі
    // await prisma.reportView.deleteMany();

    console.log("🎉 Cleanup complete!");
  } catch (err) {
    console.error("❌ Error during cleanup:", err);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
