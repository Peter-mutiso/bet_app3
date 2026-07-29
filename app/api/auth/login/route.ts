import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: NextRequest) {
  try {
    const { phone, password } =
      await req.json();

    const user =
      await prisma.user.findFirst({
        where: {
          OR: [
            { phone },
            { username: phone },
          ],
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          error: "Invalid credentials.",
        },
        {
          status: 401,
        }
      );
    }

    const valid =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!valid) {
      return NextResponse.json(
        {
          error: "Invalid credentials.",
        },
        {
          status: 401,
        }
      );
    }

    const response =
      NextResponse.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          phone: user.phone,
          balance_kes:
            user.balance_kes,
          bonus_balance_kes:
            user.bonus_balance_kes,
          currency_preference:
            user.currency,
        },
      });

    response.cookies.set(
      "userId",
      String(user.id),
      {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    return response;
  } catch {
    return NextResponse.json(
      {
        error: "Login failed.",
      },
      {
        status: 500,
      }
    );
  }
}