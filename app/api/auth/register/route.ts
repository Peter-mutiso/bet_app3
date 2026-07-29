import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

function generateReferralCode(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";

  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      username,
      phone,
      password,
      ref_code,
    } = body;

    if (!username || !phone || !password) {
      return NextResponse.json(
        { error: "All required fields are missing." },
        { status: 400 }
      );
    }

    const existingUsername =
      await prisma.user.findUnique({
        where: {
          username,
        },
      });

    if (existingUsername) {
      return NextResponse.json(
        { error: "Username already exists." },
        { status: 400 }
      );
    }

    const existingPhone =
      await prisma.user.findUnique({
        where: {
          phone,
        },
      });

    if (existingPhone) {
      return NextResponse.json(
        { error: "Phone number already registered." },
        { status: 400 }
      );
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    let referralCode = generateReferralCode();

    while (
      await prisma.user.findFirst({
        where: {
          referralCode,
        },
      })
    ) {
      referralCode = generateReferralCode();
    }

    const user =
      await prisma.user.create({
        data: {
          username,
          phone,
          password: hashedPassword,
          referralCode,
          referredBy: ref_code || null,
        },
      });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        balance_kes: user.balance_kes,
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
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    return response;
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Registration failed.",
      },
      {
        status: 500,
      }
    );
  }
}