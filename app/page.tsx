import { prisma } from "@/lib/prisma";
import { loadMergedSiteSettings } from "@/lib/site-settings";
import { getUserSession } from "@/lib/user-auth";

import TradingTerminal from "@/components/frontend/TradingTerminal";
import ShikaTerminal from "@/components/frontend/shika/ShikaTerminal";

export const dynamic = "force-dynamic";

export default async function Page() {
  const settings = await loadMergedSiteSettings();

  const pairs = await prisma.tradingPair.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      sortOrder: "asc",
    },
  });

  // Your current schema has no NewsItem model yet
  const news: any[] = [];

  const chartStyle =
    settings?.landingChartStyle ?? "candlestick";

  if (chartStyle === "shika") {
    const session = await getUserSession();

    let shikaUser = null;

    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: {
          id: Number(session.user.id),
        },
        select: {
          id: true,
          username: true,
          phone: true,
          balance_kes: true,
        },
      });

      if (user) {
        shikaUser = {
          id: user.id,
          username: user.username,
          phone: user.phone,
          balance_kes: Number(user.balance_kes),
        };
      }
    }

    return (
      <main className="w-full">
        <ShikaTerminal
          siteName={settings.siteName}
          logoUrl={settings.logoUrl ?? null}
          pairId={pairs[0]?.id ?? null}
          tradeDuration={settings.tradeDurationSeconds}
          initialUser={shikaUser}
        />
      </main>
    );
  }

  return (
    <main className="h-[100dvh] w-full overflow-hidden bg-[#0a0f1c] font-sans text-white">
      <TradingTerminal
        settings={settings}
        pairs={pairs}
        news={news}
      />
    </main>
  );
}