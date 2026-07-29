import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const trades = await prisma.trade.findMany({
      where: {
        result: "WIN", // Change to "WON" if that's what your app stores
      },
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    const wins = trades.map((trade) => ({
      name: trade.user.username,
      amount: trade.payout ?? trade.amount,
    }));

    return NextResponse.json({ wins });
  } catch (error) {
    console.error("Error fetching wins:", error);

    return NextResponse.json(
      { wins: [] },
      { status: 200 }
    );
  }
}