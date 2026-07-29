import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Trade id is required" },
        { status: 400 }
      );
    }

    const trade = await prisma.trade.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        user: true,
        pair: true,
      },
    });

    if (!trade) {
      return NextResponse.json(
        { error: "Trade not found" },
        { status: 404 }
      );
    }

    // Trade already settled
    if (trade.result && trade.result !== "PENDING") {
      return NextResponse.json({
        outcome: trade.result.toLowerCase(),
        payout: Number(trade.payout ?? 0),
      });
    }

    // Calculate trade end time
    const endTime =
      new Date(trade.createdAt).getTime() +
      Number(trade.duration) * 1000;
    // Trade still running
    if (Date.now() < endTime) {
      return NextResponse.json({
        outcome: "pending",
      });
    }

    // Simulate outcome (70% win)
    const win = Math.random() < 0.7;
    const result = win ? "WIN" : "LOSS";
    const payout = Number(trade.payout ?? 0);

    // Credit winnings
    if (win) {
      await prisma.user.update({
        where: {
          id: trade.userId,
        },
        data: {
          balance_kes: {
            increment: payout,
          },
        },
      });
    }

    // Mark trade settled
    await prisma.trade.update({
      where: {
        id: trade.id,
      },
      data: {
        result,
        settledAt: new Date(),
        exitPrice: trade.entryPrice,
      },
    });

    return NextResponse.json({
      outcome: result.toLowerCase(),
      payout: win ? payout : 0,
    });
  } catch (error) {
    console.error("Trade Result Error:", error);

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