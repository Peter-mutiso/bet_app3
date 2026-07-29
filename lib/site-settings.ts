import { prisma } from "@/lib/prisma";

export interface SiteSettings {
  siteName: string;
  siteTitle: string;
  siteDescription: string;

  logoUrl?: string | null;
  faviconUrl?: string | null;

  currencySwitcherEnabled: boolean;
  defaultCurrency: "USD" | "KES";

  maintenanceMode: boolean;
  registrationEnabled: boolean;
  liveTradingEnabled: boolean;

  conversionRate: number;
  payoutMultiplier: number;
  demoStartingBalance: number;
  tradeDurationSeconds: number;
  candleDurationSeconds: number;

  landingChartStyle: string;

  minStakeKes: number;
  maxStakeKes: number;

  buyButtonLabel: string;
  sellButtonLabel: string;

  chatSimulationEnabled: boolean;
  chatSimulationFreqMinSecs: number;
  chatSimulationFreqMaxSecs: number;

  whatsappCommunityUrl?: string | null;

  howToTradeSteps: any;
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "Trading Platform",
  siteTitle: "Trading Platform",
  siteDescription: "Real-time trading platform",

  logoUrl: null,
  faviconUrl: null,

  currencySwitcherEnabled: true,
  defaultCurrency: "USD",

  maintenanceMode: false,
  registrationEnabled: true,
  liveTradingEnabled: true,

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
};

export async function loadMergedSiteSettings(): Promise<SiteSettings> {
  try {
    const settings = await prisma.siteSettings.findFirst();

    if (!settings) {
      return DEFAULT_SETTINGS;
    }

    return {
      siteName: settings.siteName,
      siteTitle: settings.siteTitle,
      siteDescription: DEFAULT_SETTINGS.siteDescription,

      logoUrl: settings.logoUrl,
      faviconUrl: settings.faviconUrl,

      currencySwitcherEnabled: true,
      defaultCurrency: "USD",

      maintenanceMode: false,
      registrationEnabled: true,
      liveTradingEnabled: true,

      conversionRate: settings.conversionRate,
      payoutMultiplier: settings.payoutMultiplier,
      demoStartingBalance: settings.demoStartingBalance,

      tradeDurationSeconds: settings.tradeDurationSeconds,
      candleDurationSeconds: settings.candleDurationSeconds,

      landingChartStyle: settings.landingChartStyle,

      minStakeKes: settings.minStakeKes,
      maxStakeKes: settings.maxStakeKes,

      buyButtonLabel: settings.buyButtonLabel,
      sellButtonLabel: settings.sellButtonLabel,

      chatSimulationEnabled: settings.chatSimulationEnabled,
      chatSimulationFreqMinSecs: settings.chatSimulationFreqMinSecs,
      chatSimulationFreqMaxSecs: settings.chatSimulationFreqMaxSecs,

      whatsappCommunityUrl: settings.whatsappCommunityUrl,

      howToTradeSteps: settings.howToTradeSteps ?? [],
    };
  } catch (error) {
    console.error("Failed to load site settings:", error);
    return DEFAULT_SETTINGS;
  }
}