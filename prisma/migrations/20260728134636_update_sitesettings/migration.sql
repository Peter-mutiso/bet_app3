/*
  Warnings:

  - Added the required column `updatedAt` to the `SiteSettings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "buyButtonLabel" TEXT NOT NULL DEFAULT 'BUY',
ADD COLUMN     "candleDurationSeconds" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "chatSimulationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "chatSimulationFreqMaxSecs" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "chatSimulationFreqMinSecs" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "faviconUrl" TEXT,
ADD COLUMN     "howToTradeSteps" JSONB,
ADD COLUMN     "landingChartStyle" TEXT NOT NULL DEFAULT 'candlestick',
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "maxStakeKes" DOUBLE PRECISION NOT NULL DEFAULT 100000,
ADD COLUMN     "minStakeKes" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN     "sellButtonLabel" TEXT NOT NULL DEFAULT 'SELL',
ADD COLUMN     "siteTitle" TEXT NOT NULL DEFAULT 'Trading Platform',
ADD COLUMN     "tradeDurationSeconds" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "whatsappCommunityUrl" TEXT;
