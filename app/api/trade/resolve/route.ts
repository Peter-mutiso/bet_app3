import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { market } from "@/lib/market";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { tradeId } = body;

    const trade = await prisma.trade.findUnique({
      where: {
        id: Number(tradeId),
      },
      include: {
        user: true,
        pair: true,
      },
    });

    if (!trade) {
      return NextResponse.json(
        {
          error: "Trade not found",
        },
        {
          status: 404,
        }
      );
    }

    // Get the current live market price
    const exitPrice = market.getPrice();
    if (trade.entryPrice == null) {
  return NextResponse.json(
    {
      error: "Trade has no entry price",
    },
    {
      status: 400,
    }
  );
}
    let won = false;

    if (
      trade.direction === "BUY" &&
      exitPrice > trade.entryPrice
    ) {
      won = true;
    }

    if (
      trade.direction === "SELL" &&
      exitPrice < trade.entryPrice
    ) {
      won = true;
    }

    // Update the trade
    const updatedTrade = await prisma.trade.update({
      where: {
        id: trade.id,
      },
      data: {
        exitPrice,
        result: won ? "WIN" : "LOSS",
      },
    });

    // Pay the user if they won
    let updatedUser = trade.user;

    if (won) {
      updatedUser = await prisma.user.update({
        where: {
          id: trade.user.id,
        },
        data: {
          balance_kes: {
            increment: trade.payout ?? 0,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      won,
      exitPrice,
      trade: updatedTrade,
      balance: updatedUser.balance_kes,
    });
  } catch (error) {
    console.error("Trade resolve error:", error);

    return NextResponse.json(
      {
        error: "Failed to resolve trade",
      },
      {
        status: 500,
      }
    );
  }
}