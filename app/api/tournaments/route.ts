import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: {
      id: "desc",
    },
  });

  return NextResponse.json(tournaments);
}