import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      pairId,
      amount,
      direction,
      entryPrice,
      duration,
    } = body;

    if (
      pairId === undefined ||
      amount === undefined ||
      direction === undefined ||
      entryPrice === undefined
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        {
          status: 400,
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: Number(userId),
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        {
          status: 404,
        }
      );
    }

    if (user.balance_kes < Number(amount)) {
      return NextResponse.json(
        {
          error: "Insufficient balance",
        },
        {
          status: 400,
        }
      );
    }

    const pair = await prisma.tradingPair.findUnique({
      where: {
        id: Number(pairId),
      },
    });

    if (!pair) {
      return NextResponse.json(
        {
          error: "Trading pair not found",
        },
        {
          status: 404,
        }
      );
    }

    const tradeDuration = Number(duration ?? 10);
    const payout = Number(amount) * pair.payout;

    console.log("Creating trade:", {
      userId: user.id,
      pair: pair.symbol,
      amount,
      direction,
      duration: tradeDuration,
      entryPrice,
    });

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        balance_kes: {
          decrement: Number(amount),
        },
      },
    });

    const trade = await prisma.trade.create({
      data: {
        amount: Number(amount),
        direction: String(direction),
        entryPrice: Number(entryPrice),
        duration: tradeDuration,
        payout,
        result: "PENDING",
        userId: user.id,
        pairId: pair.id,
      },
    });

    console.log("Trade created successfully:", {
      tradeId: trade.id,
      userId: trade.userId,
      duration: trade.duration,
      result: trade.result,
    });

    return NextResponse.json({
      success: true,
      tradeId: trade.id,
      duration: trade.duration,
      payoutMultiplier: pair.payout,
    });
  } catch (err) {
    console.error("Trade API Error:", err);

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}