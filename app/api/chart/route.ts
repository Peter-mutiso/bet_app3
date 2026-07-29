import { NextResponse } from "next/server";
import { market } from "@/lib/market";

export async function GET() {
  try {
    const candles = market.getCandles().map((c) => ({
      time_open: new Date(c.time * 1000).toISOString(),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
    }));

    console.log("Chart API candles:", candles.length);

    if (candles.length > 0) {
      console.log("First candle:", candles[0]);
      console.log(
        "Last candle:",
        candles[candles.length - 1]
      );
    }

    return NextResponse.json(
      {
        candles,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

  } catch (error) {
    console.error(
      "Chart API error:",
      error
    );

    return NextResponse.json(
      {
        candles: [],
        error: "Failed to load candles",
      },
      {
        status: 500,
      }
    );
  }
}