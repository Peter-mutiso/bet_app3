import { NextResponse } from "next/server";
import { market } from "@/lib/market";

export async function GET() {
  return NextResponse.json({
    price: market.getPrice(),
  });
}