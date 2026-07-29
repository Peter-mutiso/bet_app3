import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Site Settings
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      siteName: "Nekta FX",
      siteTitle: "Nekta FX Trading",
      logoUrl: null,
      faviconUrl: null,

      conversionRate: 129,
      payoutMultiplier: 1.8,
      demoStartingBalance: 1000,

      tradeDurationSeconds: 10,
      candleDurationSeconds: 60,

      landingChartStyle: "candlestick",

      minStakeKes: 50,
      maxStakeKes: 100000,

      buyButtonLabel: "BUY",
      sellButtonLabel: "SELL",

      chatSimulationEnabled: true,
      chatSimulationFreqMinSecs: 20,
      chatSimulationFreqMaxSecs: 60,

      whatsappCommunityUrl: null,

      howToTradeSteps: [],
    },
  });

  // Trading Pair
  await prisma.tradingPair.upsert({
    where: {
      symbol: "BTCUSD",
    },
    update: {},
    create: {
      symbol: "BTCUSD",
      displayName: "BTC/USD",
      payout: 1.8,
      payoutMultiplier: 1.8,
      isActive: true,
      sortOrder: 1,
    },
  });

  console.log("✅ Database seeded successfully.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });