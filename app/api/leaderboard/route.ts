import { NextResponse } from "next/server";

export async function GET() {

  const leaderboard = [
    {
      rank:1,
      username:"Trader1",
      profit:1200
    },
    {
      rank:2,
      username:"Trader2",
      profit:800
    }
  ];


  return NextResponse.json(leaderboard);
}